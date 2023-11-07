# 3d meeting

注意： 凡是有注册事件必须提供 destory 方法来取消注册事件，防止内存泄露

```
├── src
│   ├── helpers
|   |    │── player                 # 角色类（人物模型控制）
|   |    │── control                # 键盘控制类
|   |    │── core                   # 核心基础类
|   |    │── emitter                # 事件分发类
|   |    │── scene                  # 场景
|   |    │── loader                 # 加载器类
|   |    │── world
|   |    └── constants.ts           # 常量定义
│   ├── components
│   ├── App.vue
│   └── main.js
```