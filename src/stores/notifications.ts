import { createStore } from "solid-js";
import type { UUID } from "crypto";

type Notification = {
	id: UUID;
	type: "success" | "info" | "warning" | "danger";
	timeStamp: number;
	message: string;
	removeTimer?: ReturnType<typeof setTimeout>;
};
type NotificationList = Array<Notification>;

const [store, setStore] = createStore<NotificationList>([]);
export const notifications = () => store;

function createNotification(type: Notification["type"], message: string) {
	const notification: Notification = {
		id: crypto.randomUUID() as UUID,
		type,
		timeStamp: Date.now(),
		message
	};
	if (type !== "danger") {
		notification.removeTimer = setTimeout(() => {
			deleteNotification(notification);
		}, 5000);
	}
	if (store.length >= 5) {
		deleteNotification(store[0]!);
	}
	setStore(draft => {
		draft.concat(notification);
	});
}

function deleteNotification(notification: Notification) {
	clearTimeout(notification.removeTimer);
	setStore(draft => {
		draft.splice(store.indexOf(notification), 1);
	});
}

export function addNotification(type: Notification["type"], message: string) {
	const existingNotification = store.find(n => n.message === message && n.type === type);
	if (!existingNotification) {
		createNotification(type, message);
		return;
	}
	deleteNotification(existingNotification);
	setTimeout(() => createNotification(type, message), 250);
}

export function removeNotification(id: UUID) {
	const notification = store.find(n => n.id === id);
	if (notification) {
		deleteNotification(notification);
	}
}