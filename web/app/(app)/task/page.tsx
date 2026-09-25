import { TaskCenter } from "@/components/app/TaskCenter";
import { getSessionUser } from "@/lib/auth/authorization";
import { getUserTasks } from "@/lib/server/tasks";

export const dynamic = "force-dynamic";

export default async function TaskCenterPage() {
  const user = await getSessionUser();
  const tasks = user ? await getUserTasks(user.uid).catch(() => []) : [];
  return <TaskCenter initialTasks={tasks} />;
}