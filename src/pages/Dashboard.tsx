import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Package, AlertTriangle, TrendingUp, Search, Filter, Download, ArrowUpDown } from 'lucide-react';
import { FakeApi } from '@/api/FakeApi';
import { exportToExcel } from '@/utils/xlsx';
import type { ProjectItemComputed, InventoryRow, Material, Project } from '@/domain/types';

interface ItemAggregation {
  item_code: string;
  description: string;
  project_name: string;
  project_id: string;
  required_qty: number;
  withdrawn_qty: number;
  allocatable_qty: number;
  missing_qty: number;
}

interface ProjectAggregation {
  project_id: string;
  project_name: string;
  engineering_supervisor?: string;
  technical_supervisor?: string;
  total_required: number;
  total_withdrawn: number;
  total_allocatable: number;
  total_missing: number;
}

type GroupingMode = 'item_code' | 'project';
type SortField = 'code' | 'description' | 'required' | 'withdrawn' | 'allocatable' | 'missing' | 'project_name' | 'engineering' | 'technical';
type SortDirection = 'asc' | 'desc';

const Dashboard = () => {
  const [computedData, setComputedData] = useState<ProjectItemComputed[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [aggregatedItems, setAggregatedItems] = useState<ItemAggregation[]>([]);
  const [aggregatedProjects, setAggregatedProjects] = useState<ProjectAggregation[]>([]);
  const [filteredItems, setFilteredItems] = useState<ItemAggregation[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectAggregation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('item_code');
  const [sortField, setSortField] = useState<SortField>('missing');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      // Recompute aggregations when projects data is available
      const computed = FakeApi.getComputedPerProject();
      const inv = FakeApi.getCurrentInventory();
      const mats = FakeApi.listMaterials();
      
      aggregateByItemCode(computed, inv, mats);
      aggregateByProject(computed, projects);
    }
  }, [projects]);

  useEffect(() => {
    filterAndSortData();
  }, [aggregatedItems, aggregatedProjects, searchQuery, showOnlyMissing, groupingMode, sortField, sortDirection]);

  const loadData = () => {
    const computed = FakeApi.getComputedPerProject();
    const inv = FakeApi.getCurrentInventory();
    const mats = FakeApi.listMaterials();
    const projs = FakeApi.listProjects();
    
    setComputedData(computed);
    setInventory(inv);
    setMaterials(mats);
    setProjects(projs);
    
    // Aggregate by both item_code and project
    aggregateByItemCode(computed, inv, mats);
    aggregateByProject(computed, projs);
  };

  const aggregateByItemCode = (computed: ProjectItemComputed[], inventory: InventoryRow[], materials: Material[]) => {
    const itemProjectCombinations: ItemAggregation[] = [];
    
    computed.forEach(item => {
      const project = projects.find(p => p.project_id === item.project_id);
      const projectName = project?.name || item.project_id;
      
      const itemAggregation: ItemAggregation = {
        item_code: item.item_code,
        // Use inventory notes as description, fallback to material description
        description: inventory.find(inv => inv.item_code === item.item_code)?.notes || 
                    materials.find(m => m.item_code === item.item_code)?.description || '',
        project_name: projectName,
        project_id: item.project_id,
        required_qty: item.required_qty,
        withdrawn_qty: item.withdrawn_qty,
        allocatable_qty: item.allocatable_qty,
        missing_qty: item.missing_qty
      };
      
      itemProjectCombinations.push(itemAggregation);
    });
    
    setAggregatedItems(itemProjectCombinations);
  };

  const aggregateByProject = (computed: ProjectItemComputed[], projects: Project[]) => {
    const projectMap = new Map<string, ProjectAggregation>();
    
    computed.forEach(item => {
      const project = projects.find(p => p.project_id === item.project_id);
      const existing = projectMap.get(item.project_id) || {
        project_id: item.project_id,
        project_name: project?.name || item.project_id,
        engineering_supervisor: project?.meta?.['الاشراف الهندسى'],
        technical_supervisor: project?.meta?.['الاشراف الفنى'],
        total_required: 0,
        total_withdrawn: 0,
        total_allocatable: 0,
        total_missing: 0
      };
      
      existing.total_required += item.required_qty;
      existing.total_withdrawn += item.withdrawn_qty;
      existing.total_allocatable += item.allocatable_qty;
      existing.total_missing += item.missing_qty;
      
      projectMap.set(item.project_id, existing);
    });
    
    setAggregatedProjects(Array.from(projectMap.values()));
  };

  const filterAndSortData = () => {
    if (groupingMode === 'item_code') {
      let filtered = aggregatedItems;
      
      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(item => 
          item.item_code.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.project_name.toLowerCase().includes(query)
        );
      }
      
      // Filter by missing > 0
      if (showOnlyMissing) {
        filtered = filtered.filter(item => item.missing_qty > 0);
      }

      // Sort items
      filtered = [...filtered].sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortField) {
          case 'code': aVal = a.item_code; bVal = b.item_code; break;
          case 'description': aVal = a.description; bVal = b.description; break;
          case 'project_name': aVal = a.project_name; bVal = b.project_name; break;
          case 'required': aVal = a.required_qty; bVal = b.required_qty; break;
          case 'withdrawn': aVal = a.withdrawn_qty; bVal = b.withdrawn_qty; break;
          case 'allocatable': aVal = a.allocatable_qty; bVal = b.allocatable_qty; break;
          case 'missing': aVal = a.missing_qty; bVal = b.missing_qty; break;
          default: aVal = a.missing_qty; bVal = b.missing_qty; break;
        }
        
        if (typeof aVal === 'string') {
          return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      });
      
      setFilteredItems(filtered);
    } else {
      let filtered = aggregatedProjects;
      
      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(project => 
          project.project_name.toLowerCase().includes(query) ||
          project.project_id.toLowerCase().includes(query) ||
          (project.engineering_supervisor && project.engineering_supervisor.toLowerCase().includes(query)) ||
          (project.technical_supervisor && project.technical_supervisor.toLowerCase().includes(query))
        );
      }
      
      // Filter by missing > 0
      if (showOnlyMissing) {
        filtered = filtered.filter(project => project.total_missing > 0);
      }

      // Sort projects
      filtered = [...filtered].sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortField) {
          case 'project_name': aVal = a.project_name; bVal = b.project_name; break;
          case 'engineering': aVal = a.engineering_supervisor || ''; bVal = b.engineering_supervisor || ''; break;
          case 'technical': aVal = a.technical_supervisor || ''; bVal = b.technical_supervisor || ''; break;
          case 'required': aVal = a.total_required; bVal = b.total_required; break;
          case 'withdrawn': aVal = a.total_withdrawn; bVal = b.total_withdrawn; break;
          case 'allocatable': aVal = a.total_allocatable; bVal = b.total_allocatable; break;
          case 'missing': aVal = a.total_missing; bVal = b.total_missing; break;
          default: aVal = a.total_missing; bVal = b.total_missing; break;
        }
        
        if (typeof aVal === 'string') {
          return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      });
      
      setFilteredProjects(filtered);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    filterAndSortData();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setShowOnlyMissing(false);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const exportData = () => {
    const dataToExport = groupingMode === 'item_code' ? 
      filteredItems.map(item => ({
        'Item Code': item.item_code,
        'Description': item.description,
        'Project Name': item.project_name,
        'Required Qty': item.required_qty,
        'Withdrawn Qty': item.withdrawn_qty,
        'Allocatable Qty': item.allocatable_qty,
        'Missing Qty': item.missing_qty
      })) :
      filteredProjects.map(project => ({
        'Project ID': project.project_id,
        'Project Name': project.project_name,
        'Engineering Supervisor (الاشراف الهندسى)': project.engineering_supervisor || '',
        'Technical Supervisor (الاشراف الفنى)': project.technical_supervisor || '',
        'Total Required': project.total_required,
        'Total Withdrawn': project.total_withdrawn,
        'Total Allocatable': project.total_allocatable,
        'Total Missing': project.total_missing
      }));

    const fileName = `shortages-${groupingMode}-${new Date().toISOString().split('T')[0]}.xlsx`;
    exportToExcel(dataToExport, fileName);
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
              <CardTitle>
                Top Shortages 
                {groupingMode === 'item_code' ? ' (by SKU)' : ' (by Project)'}
              </CardTitle>
              <CardDescription>
                Aggregated shortfalls across all {groupingMode === 'item_code' ? 'projects' : 'items'}, sorted by missing quantity
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {groupingMode === 'item_code' ? 
                  `${filteredItems.length} items` : 
                  `${filteredProjects.length} projects`}
              </Badge>
              <Button onClick={exportData} size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex flex-col space-y-4">
            {/* Grouping Mode */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium">Group by:</label>
              <Select value={groupingMode} onValueChange={(value: GroupingMode) => setGroupingMode(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="item_code">Item Code (SKU)</SelectItem>
                  <SelectItem value="project">Project Name</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search and Filter Controls */}
            <div className="flex items-center space-x-4">
              <form onSubmit={handleSearch} className="flex items-center space-x-2 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={groupingMode === 'item_code' ? 
                      "Search by item code, description, or project..." : 
                      "Search by project name or supervisors..."}
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
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  {groupingMode === 'item_code' ? (
                    <>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('code')} className="h-auto p-0 font-semibold">
                          Item Code
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('description')} className="h-auto p-0 font-semibold">
                          Description
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('project_name')} className="h-auto p-0 font-semibold">
                          Project Name
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('project_name')} className="h-auto p-0 font-semibold">
                          Project Name
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('engineering')} className="h-auto p-0 font-semibold">
                          الاشراف الهندسى
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('technical')} className="h-auto p-0 font-semibold">
                          الاشراف الفنى
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                    </>
                  )}
                  <TableHead className="text-right">
                    <Button variant="ghost" onClick={() => handleSort('required')} className="h-auto p-0 font-semibold">
                      Required
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" onClick={() => handleSort('withdrawn')} className="h-auto p-0 font-semibold">
                      Withdrawn
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" onClick={() => handleSort('allocatable')} className="h-auto p-0 font-semibold">
                      Allocatable
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" onClick={() => handleSort('missing')} className="h-auto p-0 font-semibold">
                      Missing
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupingMode === 'item_code' ? (
                  <>
                    {filteredItems.map((item, idx) => (
                      <TableRow key={`${item.item_code}-${item.project_id}`}>
                        <TableCell className="font-medium">
                          {item.item_code}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.description || 'No description'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.project_name}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.required_qty.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.withdrawn_qty.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">
                            {item.allocatable_qty.toLocaleString()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={item.missing_qty > 0 ? "destructive" : "default"}
                          >
                            {item.missing_qty.toLocaleString()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {filteredItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {searchQuery || showOnlyMissing ? 'No items match your filters' : 'No shortage data available'}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ) : (
                  <>
                    {filteredProjects.map((project) => (
                      <TableRow key={project.project_id}>
                        <TableCell className="font-medium">
                          {project.project_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {project.engineering_supervisor || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {project.technical_supervisor || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {project.total_required.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {project.total_withdrawn.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">
                            {project.total_allocatable.toLocaleString()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={project.total_missing > 0 ? "destructive" : "default"}
                          >
                            {project.total_missing.toLocaleString()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {filteredProjects.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {searchQuery || showOnlyMissing ? 'No projects match your filters' : 'No shortage data available'}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            {groupingMode === 'item_code' ? (
              filteredItems.length > 0 ? `Showing ${filteredItems.length} of ${aggregatedItems.length} items` : ''
            ) : (
              filteredProjects.length > 0 ? `Showing ${filteredProjects.length} of ${aggregatedProjects.length} projects` : ''
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;