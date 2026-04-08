import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Atom,
  BookOpen,
  ClipboardCheck,
  FileText,
  FlaskConical,
  MessageCircle,
} from 'lucide-react';

export type LectureType = 'general' | 'stem' | 'humanities' | 'discussion' | 'lab' | 'review';

interface LectureTypeOption {
  value: LectureType;
  label: string;
  icon: React.ReactNode;
}

const LECTURE_TYPES: LectureTypeOption[] = [
  { value: 'general', label: 'General', icon: <FileText className="h-3.5 w-3.5" /> },
  { value: 'stem', label: 'STEM', icon: <Atom className="h-3.5 w-3.5" /> },
  { value: 'humanities', label: 'Humanities', icon: <BookOpen className="h-3.5 w-3.5" /> },
  { value: 'discussion', label: 'Discussion', icon: <MessageCircle className="h-3.5 w-3.5" /> },
  { value: 'lab', label: 'Lab / Demo', icon: <FlaskConical className="h-3.5 w-3.5" /> },
  { value: 'review', label: 'Review', icon: <ClipboardCheck className="h-3.5 w-3.5" /> },
];

interface LectureTypeSelectProps {
  value: LectureType;
  onChange: (value: LectureType) => void;
  disabled?: boolean;
}

export function LectureTypeSelect({ value, onChange, disabled }: LectureTypeSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as LectureType)} disabled={disabled}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="Note type" />
      </SelectTrigger>
      <SelectContent>
        {LECTURE_TYPES.map((type) => (
          <SelectItem key={type.value} value={type.value} className="text-xs">
            <span className="flex items-center gap-2">
              {type.icon}
              {type.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
