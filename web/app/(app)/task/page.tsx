import { TaskCenter } from "@/components/app/TaskCenter";
import { getSessionUser } from "@/lib/auth/authorization";
import { getUserTasks } from "@/lib/server/tasks";
import type { TaskView } from "@/lib/server/tasks";

export const dynamic = "force-dynamic";

export default async function TaskCenterPage() {
  const user = await getSessionUser();

  // Signed-out visitors see the catalog shape without personal claim status.
  const tasks: TaskView[] = user
    ? await getUserTasks(user.uid).catch(() => [])
    : [];

  return <TaskCenter initialTasks={tasks} signedIn={Boolean(user)} />;
}
