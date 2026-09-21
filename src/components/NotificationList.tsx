import { createMemo, For } from "solid-js";
import { notifications, removeNotification } from "@/stores/notifications";

export default function NotificationList() {
	const sortedNotifications = createMemo(() => notifications().toSorted((a, b) => b.timeStamp - a.timeStamp), { sync: true });

	return (
		<div class="d-flex flex-column gap-2 notification-list position-fixed end-0 bottom-0 me-2 mb-2">
			<For each={sortedNotifications()}>
				{notification => (
					<div class={["alert m-0 ms-auto", { [`alert-${notification.type}`]: true }]} role="alert">
						<div class="d-flex">
							<div innerHTML={notification.message}></div>
							<button class="btn-close ms-2" onClick={() => removeNotification(notification.id)} aria-label="Close"></button>
						</div>
					</div>
				)}
			</For>
		</div>
	);
}