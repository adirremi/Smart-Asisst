import Calendar from './pages/Calendar';
import CalendarWebhook from './pages/CalendarWebhook';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import TaskWebhook from './pages/TaskWebhook';
import Tasks from './pages/Tasks';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Calendar": Calendar,
    "CalendarWebhook": CalendarWebhook,
    "Dashboard": Dashboard,
    "Settings": Settings,
    "TaskWebhook": TaskWebhook,
    "Tasks": Tasks,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};