import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface ProjectStatusSelectProps {
    status: 'Planning' | 'In Progress' | 'Completed' | 'On Hold';
    onStatusChange: (status: 'Planning' | 'In Progress' | 'Completed' | 'On Hold') => void;
    className?: string;
}

export function ProjectStatusSelect({ status, onStatusChange, className }: ProjectStatusSelectProps) {
    const getStatusColor = (s: string) => {
        switch (s) {
            case 'In Progress':
                return 'bg-primary text-primary-foreground hover:bg-primary/90';
            case 'Planning':
                return 'bg-warning text-warning-foreground hover:bg-warning/90';
            case 'Completed':
                return 'bg-success text-success-foreground hover:bg-success/90';
            case 'On Hold':
                return 'bg-secondary text-secondary-foreground hover:bg-secondary/80';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    return (
        <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger
                className={cn(
                    "w-[140px] h-8 border-none focus:ring-0 focus:ring-offset-0",
                    getStatusColor(status),
                    className
                )}
            >
                <SelectValue>{status}</SelectValue>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="Planning">Planning</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
            </SelectContent>
        </Select>
    )
}
