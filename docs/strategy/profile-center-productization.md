# Profile Center Productization

更新时间：2026-06-18

本文记录 `/personal/profile` 个人中心的当前产品化事实。它不是新的递归队列。

## 当前能力

- Admin 页面采用左侧个人摘要、右侧 Tabs：基本资料、安全设置、账号绑定、登录活动。
- 基本资料读取和更新走 `core/users/profile`，字段包括昵称、手机号、邮箱、性别、头像信息、部门名称、角色名称、岗位名称、创建时间和更新时间。
- 页面加载失败时显示错误，不回退到 `initialState`、fixture 或 mock 数据。
- 头像支持上传前预览、类型/大小校验、上传、删除二次确认，并同步当前用户头像状态。
- 安全设置支持修改密码、密码强度提示、修改后清理前端 token 并要求重新登录。
- 登录活动走 `core/users/profile/activity`，展示当前会话和最近登录日志。
- 退出其他设备走 `core/users/profile/sessions/kick-out-others`。
- 账号绑定走 profile-scoped OAuth API：
  - `integrations/oauth/profile/providers`
  - `integrations/oauth/profile/accounts`
  - `integrations/oauth/profile/flows`
  - `integrations/oauth/profile/accounts/{id}/unbind`
- profile OAuth provider/account DTO 不暴露 `secretRef`、`config`、`accessTokenRef` 或 `refreshTokenRef`。
- 未完成真实 OAuth 应用配置的账号绑定通道会显示待配置状态；前端不会打开外部授权页，profile flow API 也会拒绝未就绪通道，避免演示配置跳到无效授权地址。
- 前端文案走 i18n，中文环境避免裸 key 和未本地化的 Provider 文案。

## 验收门槛

- OpenAPI 导出包含 profile activity、kick-out-others 和 profile OAuth API。
- SDK path spec 覆盖新增 profile activity/session 和 profile OAuth API。
- Admin smoke guard 覆盖四个 Tab、profile OAuth service、activity service，并拒绝 session fallback。
- `tools/smoke/smoke-core-profile.ts` 覆盖真实登录、资料更新后刷新、activity、其他会话退出、profile OAuth provider/account redaction；有 ready provider 时覆盖 flow/account/unbind，没有 ready provider 时覆盖 not-ready guard。
- 部署后必须通过固定入口：
  - API: `http://144.217.243.161:39172`
  - Admin: `http://144.217.243.161:39174`
  - deploy script: `pnpm deploy:opencore`

## 当前验收结果

- 固定部署脚本已通过，部署端口为 API `39172`、Admin `39174`。
- Public API profile smoke 已通过：
  - `core.profile.fields.read`
  - `core.profile.fields.update`
  - `core.profile.fields.refresh`
  - `core.profile.activity.read`
  - `core.profile.sessions.kick-out-others`
  - `core.profile.oauth.providers`
  - `core.profile.oauth.accounts`
  - `core.profile.oauth.flow` / `core.profile.oauth.unbind`，或默认演示环境下的 `core.profile.oauth.not-ready-guard`
- Public Admin profile UI smoke 已通过：
  - `admin.public-profile.authenticated-access`
  - `admin.public-profile.zh-cn-tabs`
  - `admin.public-profile.oauth-not-ready`
  - `admin.public-profile.oauth-no-external-404`
  - `admin.public-profile.no-raw-keys`

## 明确剩余债务

- 头像裁剪暂未实现；当前不引入新裁剪依赖，等需要固定头像构图时再用现有前端栈补。
- 本轮不做 MFA、Passkey、企业 SSO 管理平台、多租户账号体系。
- profile OAuth 当前完成 state/callback/token archive/解绑审计的基础闭环；真实外部账号授权体验取决于部署环境里的 OAuth 通道配置，未配置完成时只显示待配置状态。
