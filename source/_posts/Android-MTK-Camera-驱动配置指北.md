---
title: Android MTK 平台 Camera 驱动配置指北
date: 2026-05-19T13:40:00.000Z
categories:
  - 技术笔记
tags:
  - Android
  - Camera
  - MTK
  - 驱动
---

> 面向小白的完整配置流程，从拿到新 Sensor 到点亮 Camera 的每一步。

## 背景

MTK（MediaTek）平台的 Camera 驱动配置，本质是告诉系统：**这颗 Sensor 长什么样、怎么供电、怎么通信、怎么出图** 。

整个链路：`Sensor → I2C → Kernel Driver → HAL → Framework → App`

本文以 **Android 13 / MTK Dimensity 系列** 为例，其他版本思路相同。

* * *

## 📦 第一步：拿到 Sensor 资料

硬件工程师会给你一份 Sensor **Datasheet** ，你需要确认以下关键参数：

参数 | 说明  
---|---  
**I2C 地址** | 通信地址（如 `0x3c`）  
**电源电压** | AVDD、DVDD、IOVDD 各多少 V  
**MCLK 频率** | 主时钟，通常是 24MHz 或 19.2MHz  
**上电时序** | 各电源、Reset、Standby 的先后顺序  
**分辨率 & 输出格式** | 如 48M、RAW10/RAW16  
**驱动类型** | RAW Sensor（高通/MTK 通用）还是 YUV/USB  
  
> **小白提示** ：大部分主流 Sensor（Sony IMX系列、Samsung S5K系列、OmniVision OV系列）网上有现成的 DTS 配置可以参考，不用从零写。

* * *

## 🔌 第二步：配置设备树（DTS/DTBO）

这是最核心的一步。MTK 的 Camera DTS 通常在：

```plaintext
kernel-common/arch/arm64/boot/dts/mediatek/
├── <project>_camera.dtsi      # 主摄像头配置
└── <project>_camera.dtsi     # 物理连线
```

### 2.1 定义 Sensor 节点

```dts
&kd_camera_hw1 {
    camera0: cam_sensor@0 {
        // I2C 地址（左移 1 位）
        i2c_addr = <0x78>;
        // 电源配置
        avdd-supply = <&mt6373_vtp>;
        avdd-voltage = <2800000>;
        iovdd-supply = <&mt6359_vemc>;
        iovdd-voltage = <1800000>;
        dvdd-supply = <&mt6359_vmc>;
        dvdd-voltage = <1200000>;
        // MCLK 时钟
        clocks = <&cam_mclk2_clk>;
        clock-names = "mclk";
        // 复位引脚
        rst-gpios = <&pio 40 0>;
        // PDN（Power Down）引脚
        pdn-gpios = <&pio 41 0>;
        // Sensor 型号
        sensor_name = "imx582_mipi_raw";
        // 物理位置
        sensor_pos = "rear";
    };
};
```

### 2.2 上电时序（Power Sequence）

上电时序错了，Sensor 初始化一定失败。MTK 用 `cam_pm_seq` 控制：

```dts
// 上电顺序：IOVDD → AVDD → DVDD → MCLK → RST
// 下电顺序反过来
cam_pm_seq = <0 0 1800000>,
             <1 0 1200000>,
             <2 0 2800000>,
             <3 0 0>,
             <4 0 0>;
```

> **含义** ：`<type delay voltage>` — type 0=IOVDD, 1=AVDD, 2=DVDD, 3=MCLK, 4=RST

### 2.3 编译验证

```plaintext
./build.sh -k camera        # 仅编译内核 Camera 部分
检查 dmesg 是否有 "kd_camera_hw" 相关的 probe 信息
```

* * *

## 🧩 第三步：添加 Kernel Sensor Driver

MTK 的 sensor driver 放在：

```plaintext
kernel-common/drivers/misc/mediatek/imgsensor/src/common/v1_1/
```

每个 Sensor 一个文件夹，包含：

```plaintext
imx582_mipi_raw/
├── imx582_mipi_raw_Sensor.c     # 核心驱动
├── imx582_mipi_raw_otp.c        # 校准数据（可选）
└── imx582_mipi_raw.h            # 寄存器定义
```

### 3.1 驱动入口要点

驱动需要实现 MTK 定义的接口：

```c
// 必须实现的回调
static struct IMGSENSOR_HW_CFG imx582_sensor_hw_cfg = {
    .sensor_name = "imx582_mipi_raw",
    .sensor_id   = IMX582_SENSOR_ID,
};

// 初始化函数
static sensor_attr_t imx582_sensor_attrs = {
    .reg_addr_type  = I2C_WORD_ADDR,
    .addr_type      = I2C_BYTE_ADDR,
    .sensor_name    = "imx582_mipi_raw",
    .sensor_id      = IMX582_SENSOR_ID,
    .sensor_mode    = SENSOR_MODE_RAW,
};
```

> **小白提示** ：**不要自己从头写驱动** 。找一颗同厂商、同系列的 Sensor 驱动做模板，改寄存器地址和初始化序列即可。比如 IMX586 → IMX582 改动很小。

### 3.2 注册到 Makefile

确保 `Kconfig` 和 `Makefile` 里有你的 sensor：

```makefile
# Makefile
obj-y += imx582_mipi_raw/
```

* * *

## ⚙️ 第四步：HAL 层配置

MTK Camera HAL3 的配置文件：

```plaintext
vendor/mediatek/proprietary/custom/<project>/hal/camera/
├── camera_project.xml     # 主配置
└── sensorlist.cpp        # Sensor 列表
```

### 4.1 camera_project.xml

```xml
<CameraModule>
    <CameraId>0</CameraId>
    <SensorName>imx582_mipi_raw</SensorName>
    <!-- 物理位置: 0=后置, 1=前置 -->
    <SensorFacing>0</SensorFacing>
    <SensorOrientation>90</SensorOrientation>
    <!-- 最大分辨率 -->
    <SensorWidth>8000</SensorWidth>
    <SensorHeight>6000</SensorHeight>
    <!-- 闪光灯支持 -->
    <FlashSupport>1</FlashSupport>
</CameraModule>
```

### 4.2 sensorlist.cpp

```cpp
static sensor_info sensor_list[] = {
    {IMX582_SENSOR_ID, "imx582_mipi_raw", SENSOR_DRVNAME_IMX582_MIPI_RAW},
    // ...
};
```

* * *

## 🔍 第五步：校准数据（OTP/EEPROM）

Sensor 出厂时烧录了 **AF（自动对焦）位置、AWB（白平衡）参数、LSC（镜头阴影校正）** 等数据。

如果校准数据没读到，画面可能：偏色、对焦不准、四周暗角。

配置入口：

```plaintext
vendor/mediatek/proprietary/custom/<project>/hal/eeprom/
├── eeprom_cam_cal_driver.c
└── eeprom_list.h
```

```c
static EepromInfo_T eeprom_info = {
    .sensor_name = "imx582_mipi_raw",
    .eeprom_type = EEPROM_I2C,
    .i2c_addr    = 0xA0,
    .slave_addr  = 0x50,
    .data_size   = 2048,
};
```

* * *

## 🧪 第六步：验证与调试

### Kernel 侧

```bash
# 查看 Camera 设备是否注册
ls /dev/video*

# dmesg 查看 probe 日志
dmesg | grep -i "cam\|sensor\|imgsensor"

# 查看 I2C 通信是否正常
i2cdetect -y <bus-number>
```

### HAL 侧

```bash
# 在 adb shell 中测试
adb shell dmesg | grep "cam"
adb shell cat /proc/camera_info

# 使用 mtk_cam_test 测试抓图
mtk_cam_test -f -s 0 -r capture
```

### 常见问题

症状 | 大概率原因  
---|---  
**I2C 读不通** | IOVDD 电压不对 / I2C 地址填错  
**Probe 失败** | 上电时序错 / MCLK 没起  
**出图全绿/全粉** | 数据线接错 / MIPI 通道数不对  
**画面偏色** | 校准数据没读到 / 白平衡增益不对  
**无法对焦** | AF 驱动没配置 / OTP 没读到  
**预览卡顿** | FPS 配高了 / 分辨率设置不对  
  
* * *

## 📋 快捷自查清单

当你拿到一个新项目配置 Camera 时，按这个顺序检查：

```plaintext
✅ I2C 地址是否正确（注意左移 1 位）
✅ 各供电电压与 Datasheet 一致
✅ 上电下电时序正确（尤其 RESET 和 PDN 的拉高/拉低时机）
✅ MCLK 频率匹配（24MHz 还是 19.2MHz）
✅ MIPI Lane 数量与 Sensor 输出一致
✅ Sensor ID 寄存器读回值与驱动里写的一致
✅ HAL 层的 SensorName 与驱动层一致
✅ OTP/EEPROM 校准数据路径正确
```

* * *

## 推荐资源

  * [MTK Camera Customization Guide](https://online.mediatek.com/) — MTK 官方文档（需账号）
  * [Android Camera HAL3 官方文档](https://source.android.com/docs/core/camera) — 理解 HAL 架构
  * GitHub 搜索 `imx582_mipi_raw` 等 sensor 驱动 — 参考别人是怎么写的
  * CSDN 搜索 `MTK Camera 移植` — 中文实战经验多

* * *

**参考链接：**

  * [Android Camera HAL3](https://source.android.com/docs/core/camera)
  * [MTK Online Doc](https://online.mediatek.com/)
