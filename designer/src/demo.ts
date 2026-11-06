// 在线 Demo 用静态站点运行，没有后端可依赖：登录、打开、保存都需要单独处理。
export const isDemoMode = import.meta.env.VITE_DEMO === 'true'
