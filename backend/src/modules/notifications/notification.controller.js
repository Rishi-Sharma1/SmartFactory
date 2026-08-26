import * as notificationService from './notification.service.js';

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationService.getNotifications(req.factoryId);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await notificationService.markAsRead(id, req.factoryId);
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.factoryId);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

export const getConfig = async (req, res, next) => {
  try {
    const config = await notificationService.getAlertConfig(req.factoryId);
    res.json(config);
  } catch (err) {
    next(err);
  }
};

export const updateConfig = async (req, res, next) => {
  try {
    const updated = await notificationService.updateAlertConfig(req.factoryId, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};
