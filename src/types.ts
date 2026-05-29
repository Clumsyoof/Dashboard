export type Theme = 
  | 'mocha' 
  | 'kanagawa' 
  | 'gruvbox' 
  | 'rosepine' 
  | 'nord' 
  | 'tokyonight' 
  | 'everforest'
  | 'rosepinemoon'
  | 'rosepinedawn'
  | 'macchiato'
  | 'frappe'
  | 'latte'
  | 'gruvboxsoft'
  | 'everforestsoft'
  | 'nordsoft'
  | 'dracula'
  | 'onedark'
  | 'aura'
  | 'solarizeddark'
  | 'tokyonightstorm';

export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'cancelled';

export interface AttendanceLog {
  id: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  targetPercent: number; // default 75
  logs: AttendanceLog[];
  isCourse?: boolean; // if false, self-study topic (no class logs)
  color?: string; // custom category coloring
}

export interface ScheduleBlock {
  id: string;
  googleEventId?: string;
  subjectId?: string;
  subjectName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM (can be empty for all-day holidays)
  endTime: string; // HH:MM
  color: string; // HSL color or tag
  type?: 'study' | 'exam' | 'conference' | 'task' | 'holiday';
  isRecurring?: boolean;
  recurrenceRule?: string;
}

export type TaskStatus = 'todo' | 'inprogress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Project {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId?: string;
  subjectId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string; // YYYY-MM-DD
  completedDate?: string;
}

export interface PomodoroConfig {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number; // rounds after which long break triggers
}

export interface PomodoroStatsLog {
  id: string;
  subjectId?: string;
  subjectName?: string;
  durationMinutes: number;
  date: string; // YYYY-MM-DD
  timestamp: number;
}

export interface DashboardBackup {
  subjects: Subject[];
  schedule: ScheduleBlock[];
  projects: Project[];
  tasks: Task[];
  pomodoroConfig: PomodoroConfig;
  pomodoroLogs: PomodoroStatsLog[];
  theme: Theme;
  contributions?: Record<string, number>; // date -> count
  googleClientId?: string;
}
