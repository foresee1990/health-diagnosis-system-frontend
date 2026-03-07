# 路由设计

## 一、路由表

| 路径 | 组件 | 是否需要登录 | 说明 |
|------|------|------------|------|
| `/login` | `LoginView.vue` | 否 | 登录页 |
| `/register` | `RegisterView.vue` | 否 | 注册页 |
| `/chat` | `ChatView.vue` | **是** | 主聊天页，展示欢迎信息或空白状态 |
| `/chat/:consultationId` | `ChatView.vue` | **是** | 打开指定会话的聊天页 |
| `/` | 重定向 → `/chat` | - | 根路径重定向 |

---

## 二、路由配置代码示意

```js
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/', redirect: '/chat' },
  { path: '/login', component: () => import('@/views/LoginView.vue') },
  { path: '/register', component: () => import('@/views/RegisterView.vue') },
  {
    path: '/chat',
    component: () => import('@/views/ChatView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/chat/:consultationId',
    component: () => import('@/views/ChatView.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局导航守卫：未登录则跳转 /login
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.token) {
    return '/login'
  }
})

export default router
```

---

## 三、路由参数说明

`/chat/:consultationId` 中的 `consultationId` 为问诊会话 ID（数字）。

在 `ChatView.vue` 中通过以下方式获取：

```js
import { useRoute } from 'vue-router'
const route = useRoute()
const consultationId = route.params.consultationId  // 字符串，使用时转 Number
```

---

## 四、页面跳转规则

- 用户未登录时访问 `/chat`，自动跳转 `/login`
- 登录成功后，跳转至 `/chat`
- 注册成功后，跳转至 `/login`
- 退出登录后，清除 token，跳转至 `/login`
- 点击左侧历史会话，使用 `router.push('/chat/' + consultationId)` 跳转
- 创建新会话后，使用 `router.push('/chat/' + newId)` 跳转至新会话
