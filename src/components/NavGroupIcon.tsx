import React from "react";
import {
  FileBarChart,
  Users,
  ClipboardCheck,
  IndianRupee,
  UserRoundCheck,
  Cloud,
  GraduationCap,
  BookOpenCheck,
  Bell,
  Activity,
} from "lucide-react";

export default function NavGroupIcon({ name }: { name: string }) {
  switch (name) {
    case "Master Setup":
    case "Masters":
      return <FileBarChart />;
    case "People":
      return <Users />;
    case "Attendance":
      return <ClipboardCheck />;
    case "Finance":
      return <IndianRupee />;
    case "HR":
      return <UserRoundCheck />;
    case "Assets & Inventory":
      return <Cloud />;
    case "ID Cards":
      return <GraduationCap />;
    case "Academics":
      return <BookOpenCheck />;
    case "Communication":
      return <Bell />;
    case "Administration":
    case "System":
      return <Activity />;
    default:
      return <Activity />;
  }
}
