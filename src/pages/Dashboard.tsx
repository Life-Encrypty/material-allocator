import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Package, AlertTriangle, TrendingUp, Search, Filter } from 'lucide-react';
import { FakeApi } from '@/api/FakeApi';
import type { ProjectItemComputed, InventoryRow, Material } from '@/domain/types';

interface ItemAggregation {
  item_code: string;
  description: string;
  total_required: number;
  total_withdrawn: number;
  total_allocatable: number;
  total_missing: number;
}

const Dashboard = () => {
  const [computedData, setComputedData] = useState<ProjectItemComputed[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [aggregatedItems, setAggregatedItems] = useState<ItemAggregation[]>([]);
  const [filteredItems, setFilteredItems] = useState<ItemAggregation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterItems();
  }, [aggregatedItems, searchQuery, showOnlyMissing]);

  const loadData = () => {
    const computed = FakeApi.getComputedPerProject();
    const inv = FakeApi.getCurrentInventory();
    const mats = FakeApi.listMaterials();
    
    setComputedData(computed);
    setInventory(inv);
    setMaterials(mats);
    
    // Aggregate by item_code
    aggregateByItemCode(computed, mats);
  };

  const aggregateByItemCode = (computed: ProjectItemComputed[], materials: Material[]) => {
    const itemMap = new Map<string, ItemAggregation>();
    
    computed.forEach(item => {
      const existing = itemMap.get(item.item_code) || {
        item_code: item.item_code,
        description: materials.find(m => m.item_code === item.item_code)?.description || '',
        total_required: 0,
        total_withdrawn: 0,
        total_allocatable: 0,
        total_missing: 0
      };
      
      existing.total_required += item.required_qty;
      existing.total_withdrawn += item.withdrawn_qty;
      existing.total_allocatable += item.allocatable_qty;
      existing.total_missing += item.missing_qty;
      
      itemMap.set(item.item_code, existing);
    });
    
    // Sort by total missing descending
    const sorted = Array.from(itemMap.values())
      .sort((a, b) => b.total_missing - a.total_missing)
      .slice(0, 20);
    
    setAggregatedItems(sorted);
  };

  const filterItems = () => {
    let filtered = aggregatedItems;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.item_code.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    }
    
    // Filter by missing > 0
    if (showOnlyMissing) {
      filtered = filtered.filter(item => item.total_missing > 0);
    }
    
    setFilteredItems(filtered);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    filterItems();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setShowOnlyMissing(false);
  };

  // Calculate summary metrics
  const totalStock = inventory.reduce((sum, row) => sum + row.current_balance, 0);
  const totalRequired = computedData.reduce((sum, item) => sum + item.required_qty, 0);
  const totalAllocatable = computedData.reduce((sum, item) => sum + item.allocatable_qty, 0);
  const totalMissing = computedData.reduce((sum, item) => sum + item.missing_qty, 0);

  const summaryCards = [
    {
      title: 'Total Stock',
      value: totalStock.toLocaleString(),
      description: 'Current inventory balance',
      icon: Package,
      color: 'text-primary'
    },
    {
      title: 'Total Required',
      value: totalRequired.toLocaleString(),
      description: 'Across all projects',
      icon: BarChart3,
      color: 'text-accent'
    },
    {
      title: 'Total Allocatable',
      value: totalAllocatable.toLocaleString(),
      description: 'Available for allocation',
      icon: TrendingUp,
      color: 'text-success'
    },
    {
      title: 'Total Missing',
      value: totalMissing.toLocaleString(),
      description: 'Shortfall across projects',
      icon: AlertTriangle,
      color: 'text-destructive'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of material allocation across all projects
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Shortages Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top Shortages (by SKU)</CardTitle>
              <CardDescription>
                Aggregated shortfalls across all projects, sorted by missing quantity
              </CardDescription>
            </div>
            <Badge variant="secondary">
              Top {Math.min(20, aggregatedItems.length)}
            </Badge>
          </div>
          
          {/* Search and Filter Controls */}
          <div className="flex items-center space-x-4">
            <form onSubmit={handleSearch} className="flex items-center space-x-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by item code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" size="sm">
                Search
              </Button>
            </form>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={showOnlyMissing ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyMissing(!showOnlyMissing)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Only missing &gt; 0
              </Button>
              
              {(searchQuery || showOnlyMissing) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Required</TableHead>
                  <TableHead className="text-right">Withdrawn</TableHead>
                  <TableHead className="text-right">Allocatable</TableHead>
                  <TableHead className="text-right">Missing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item, index) => (
                  <TableRow key={item.item_code}>
                    <TableCell className="font-medium">
                      {item.item_code}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.description || 'No description'}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.total_required.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.total_withdrawn.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        {item.total_allocatable.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={item.total_missing > 0 ? "destructive" : "default"}
                      >
                        {item.total_missing.toLocaleString()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchQuery || showOnlyMissing ? 'No items match your filters' : 'No shortage data available'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {filteredItems.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredItems.length} of {aggregatedItems.length} items
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;