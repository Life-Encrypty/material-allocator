import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, Settings, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getCurrentUser, setCurrentUser, USERS, type User as UserType } from '@/auth/session'
import { cn } from '@/lib/utils'

const Navbar = () => {
  const location = useLocation()
  const [currentUser, setCurrentUserState] = useState<UserType>(getCurrentUser())

  useEffect(() => {
    const handleUserChange = (event: CustomEvent) => {
      setCurrentUserState(event.detail)
    }

    window.addEventListener('userChanged', handleUserChange as EventListener)
    return () => window.removeEventListener('userChanged', handleUserChange as EventListener)
  }, [])

  const handleUserSelect = (userId: string) => {
    setCurrentUser(userId)
  }

  const navigation = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Projects', path: '/projects' },
    { name: 'Inventory', path: '/inventory' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left: App Name */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-md bg-gradient-primary flex items-center justify-center">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">Material Allocator</span>
            </Link>
          </div>

          {/* Center: Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive(item.path)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right: User Dropdown & Role Badge */}
          <div className="flex items-center space-x-3">
            <Badge 
              variant={currentUser.role === 'admin' ? 'destructive' : 'default'}
              className={cn(
                "text-xs font-medium",
                currentUser.role === 'admin' 
                  ? "bg-role-admin text-role-admin-foreground" 
                  : "bg-role-editor text-role-editor-foreground"
              )}
            >
              {currentUser.role}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>{currentUser.name}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover">
                {USERS.map((user) => (
                  <DropdownMenuItem
                    key={user.id}
                    onClick={() => handleUserSelect(user.id)}
                    className={cn(
                      "flex items-center justify-between cursor-pointer",
                      currentUser.id === user.id && "bg-accent"
                    )}
                  >
                    <span>{user.name}</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        user.role === 'admin' 
                          ? "border-role-admin text-role-admin" 
                          : "border-role-editor text-role-editor"
                      )}
                    >
                      {user.role}
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center space-x-1 pb-3">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                isActive(item.path)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default Navbar