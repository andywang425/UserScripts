# 原神玩家指示器 plus

本脚本只支持新版 B 站评论区。由于 B 站一直在更改前端页面结构，脚本可能会失效。我会尽量及时更新。

## 功能

- 自动标出评论区中的原神玩家
  - 如果发现原神玩家，在其昵称右侧添加一个紫色背景的“原友”图标（样式类似 UP 标志）。
  - 判断依据是评论者发布的动态/视频里是否有原神二字，如果评论者在动态中提及原神相关词汇但就是不提“原神”，脚本无法识别。之后可能会针对这一点做改进。

## 改进

和原版相比，本脚本做了以下改进：

- 使用`MutationObserver`检测页面结构变化，效率高，响应速度快，资源占用少。
- 对 B 站 API 的请求模拟得更真实。
- 使用节流算法，限制了对 B 站 API 的请求频率，防止因为高频调用 API 被 B 站风控。

## 鸣谢

本脚本的灵感来源于[原神玩家指示器](https://greasyfork.org/zh-CN/scripts/450720-%E5%8E%9F%E7%A5%9E%E7%8E%A9%E5%AE%B6%E6%8C%87%E7%A4%BA%E5%99%A8)。

## 更新日志

请查阅[CHANGELOG](https://github.com/andywang425/UserScripts/tree/master/MarkGenShinPlayer/CHANGELOG.md)。

## 作者的话

我认为，查成分只是初步判断一个人的爱好、立场，是为了后续的质疑做铺垫，若是想反驳要拿出论据，仅依据成分就否定他人观点不可取。我曾经也犯过这种错误，希望大家在网络上看见与自身观点不符的言论时都能理智一些。

## GitHub 项目地址

https://github.com/andywang425/UserScripts/tree/master/MarkGenShinPlayer
