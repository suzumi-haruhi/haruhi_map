import { createRouter, createWebHistory } from 'vue-router'
import MapView from '../views/MapView.vue'
import UserView from '../views/UserView.vue'
import AdminView from '../views/AdminView.vue'
import LandmarksView from '../views/LandmarksView.vue'
import LandmarkDetailView from '../views/LandmarkDetailView.vue'
import PostDetailView from '../views/PostDetailView.vue'

const routes = [
  {
    path: '/',
    name: 'map',
    component: MapView,
    children: [
      { path: 'posts/:id', name: 'postDetail', component: PostDetailView }
    ]
  },
  { path: '/landmarks', name: 'landmarks', component: LandmarksView },
  { path: '/landmarks/:id', name: 'landmarkDetail', component: LandmarkDetailView },
  { path: '/user', name: 'user', component: UserView },
  { path: '/admin', name: 'admin', component: AdminView },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from) {
    // 地图↔帖子详情是同一 MapView 的子路由切换，滚动由内部容器自行管理
    if (to.name === 'postDetail' || from?.name === 'postDetail') return false
    return { top: 0 }
  }
})

export default router
