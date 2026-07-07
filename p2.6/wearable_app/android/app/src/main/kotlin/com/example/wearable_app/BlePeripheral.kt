package com.example.wearable_app

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.os.ParcelUuid
import android.util.Log
import io.flutter.plugin.common.MethodChannel
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class BlePeripheral(private val context: Context, private val channel: MethodChannel) {
    private val SERVICE_UUID = UUID.fromString("12345678-1234-1234-1234-123456789abc")
    private val STEPS_UUID = UUID.fromString("aaaaaaaa-0001-1234-1234-123456789abc")
    private val HR_UUID = UUID.fromString("aaaaaaaa-0002-1234-1234-123456789abc")
    private val CAL_UUID = UUID.fromString("aaaaaaaa-0003-1234-1234-123456789abc")
    private val STATUS_UUID = UUID.fromString("aaaaaaaa-0004-1234-1234-123456789abc")

    private val CCCD_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

    private var gattServer: BluetoothGattServer? = null
    private var advertiser: BluetoothLeAdvertiser? = null
    private var isAdvertising = false
    private var connectedDevices = ConcurrentHashMap<BluetoothDevice, Boolean>()

    private val stepsChar: BluetoothGattCharacteristic by lazy {
        BluetoothGattCharacteristic(STEPS_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
            BluetoothGattCharacteristic.PERMISSION_READ)
    }
    private val hrChar: BluetoothGattCharacteristic by lazy {
        BluetoothGattCharacteristic(HR_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
            BluetoothGattCharacteristic.PERMISSION_READ)
    }
    private val calChar: BluetoothGattCharacteristic by lazy {
        BluetoothGattCharacteristic(CAL_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
            BluetoothGattCharacteristic.PERMISSION_READ)
    }
    private val statusChar: BluetoothGattCharacteristic by lazy {
        BluetoothGattCharacteristic(STATUS_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
            BluetoothGattCharacteristic.PERMISSION_READ)
    }

    fun start() {
        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        val adapter = bluetoothManager.adapter
        if (adapter == null || !adapter.isEnabled) {
            Log.e("BlePeripheral", "Bluetooth desactivado o adapter null")
            channel.invokeMethod("onError", "Bluetooth desactivado")
            return
        }
        Log.d("BlePeripheral", "Bluetooth adapter OK")

        gattServer = bluetoothManager.openGattServer(context, gattServerCallback)
        if (gattServer == null) {
            Log.e("BlePeripheral", "openGattServer devolvió null")
            channel.invokeMethod("onError", "openGattServer devolvió null")
            return
        }
        Log.d("BlePeripheral", "GATT server abierto")
        setupServices()
        startAdvertising()
        isAdvertising = true
        channel.invokeMethod("onStarted", true)
        Log.d("BlePeripheral", "BLE Peripheral started")
    }

    private fun setupServices() {
        val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
        
        // Add CCCD descriptors for NOTIFY
        stepsChar.addDescriptor(BluetoothGattDescriptor(CCCD_UUID,
            BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE))
        hrChar.addDescriptor(BluetoothGattDescriptor(CCCD_UUID,
            BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE))
        calChar.addDescriptor(BluetoothGattDescriptor(CCCD_UUID,
            BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE))
        statusChar.addDescriptor(BluetoothGattDescriptor(CCCD_UUID,
            BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE))

        service.addCharacteristic(stepsChar)
        service.addCharacteristic(hrChar)
        service.addCharacteristic(calChar)
        service.addCharacteristic(statusChar)
        
        gattServer?.addService(service)
        Log.d("BlePeripheral", "GATT services added")
    }

    private fun startAdvertising() {
        val btManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        advertiser = btManager.adapter.bluetoothLeAdvertiser

        if (advertiser == null) {
            Log.e("BlePeripheral", "bluetoothLeAdvertiser es null (advertising no disponible)")
            channel.invokeMethod("onError", "bluetoothLeAdvertiser es null")
            return
        }

        try {
            // Evita que quede un advertising anterior bloqueando el siguiente intento
            advertiser?.stopAdvertising(advertiseCallback)
        } catch (_: Exception) {
        }

        Log.d("BlePeripheral", "Advertiser OK - starting advertising")

        fun settings(mode: Int, connectable: Boolean): AdvertiseSettings = AdvertiseSettings.Builder()
            .setAdvertiseMode(mode)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(connectable)
            .build()

        fun data(includeName: Boolean): AdvertiseData = AdvertiseData.Builder()
            .setIncludeDeviceName(includeName)
            .addServiceUuid(ParcelUuid(SERVICE_UUID))
            .build()

        // Intent 1: más compatible (BALANCED) y sin nombre
        val settings1 = settings(AdvertiseSettings.ADVERTISE_MODE_BALANCED, true)
        val data1 = data(false)
        Log.d(
            "BlePeripheral",
            "Advertising attempt1: mode=BALANCED connectable=true includeName=false serviceUuid=$SERVICE_UUID"
        )
        advertiser?.startAdvertising(settings1, data1, advertiseCallback)
    }

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
            Log.d("BlePeripheral", "Advertising started successfully")
        }
        override fun onStartFailure(errorCode: Int) {
            Log.e("BlePeripheral", "Advertising failed: $errorCode")

            // Fallback attempt2: intenta un modo distinto y vuelve a incluir nombre.
            // Esto es para evitar quedarnos "bloqueados" si LOW_LATENCY/BALANCED falla en un chipset.
            try {
                val settings2 = AdvertiseSettings.Builder()
                    .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                    .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                    .setConnectable(true)
                    .build()

                val data2 = AdvertiseData.Builder()
                    .setIncludeDeviceName(true)
                    .addServiceUuid(ParcelUuid(SERVICE_UUID))
                    .build()

                Log.d(
                    "BlePeripheral",
                    "Advertising attempt2: mode=LOW_LATENCY connectable=true includeName=true serviceUuid=$SERVICE_UUID"
                )
                advertiser?.startAdvertising(settings2, data2, this)
                return
            } catch (e: Exception) {
                Log.e("BlePeripheral", "Advertising attempt2 exception: ${e.message}")
            }

            channel.invokeMethod("onError", "Advertising failed: $errorCode")
        }
    }

    private val gattServerCallback = object : BluetoothGattServerCallback() {
        override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                connectedDevices[device] = true
                channel.invokeMethod("onConnected", device.name)
                Log.d("BlePeripheral", "Device connected: ${device.name}")
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                connectedDevices.remove(device)
                channel.invokeMethod("onDisconnected", device.name)
                Log.d("BlePeripheral", "Device disconnected: ${device.name}")
            }
        }

        override fun onDescriptorWriteRequest(device: BluetoothDevice, requestId: Int, descriptor: BluetoothGattDescriptor, preparedWrite: Boolean, responseNeeded: Boolean, offset: Int, value: ByteArray) {
            if (descriptor.uuid == CCCD_UUID) {
                gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, value)
                val enabled = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE.contentEquals(value)
                Log.d("BlePeripheral", "Notifications ${if (enabled) "enabled" else "disabled"} for ${descriptor.characteristic.uuid}")
            } else {
                gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, value)
            }
        }

        override fun onCharacteristicReadRequest(device: BluetoothDevice, requestId: Int, offset: Int, characteristic: BluetoothGattCharacteristic) {
            gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, characteristic.value ?: byteArrayOf())
        }
    }

    private fun notifyCharacteristic(characteristic: BluetoothGattCharacteristic, value: ByteArray) {
        characteristic.value = value
        for (device in connectedDevices.keys) {
            gattServer?.notifyCharacteristicChanged(device, characteristic, false)
        }
    }

    fun notifySteps(value: Int) {
        val bytes = java.nio.ByteBuffer.allocate(4).order(java.nio.ByteOrder.LITTLE_ENDIAN).putInt(value).array()
        Log.d("BlePeripheral", "notifySteps($value) ${connectedDevices.size} device(s) connected")
        notifyCharacteristic(stepsChar, bytes)
        Log.d("BlePeripheral", "Notified steps: $value")
    }

    fun notifyHeartRate(value: Int) {
        val bytes = byteArrayOf(value.toByte())
        notifyCharacteristic(hrChar, bytes)
        Log.d("BlePeripheral", "Notified heart rate: $value")
    }

    fun notifyCalories(value: Int) {
        val bytes = java.nio.ByteBuffer.allocate(2).order(java.nio.ByteOrder.LITTLE_ENDIAN).putShort(value.toShort()).array()
        notifyCharacteristic(calChar, bytes)
        Log.d("BlePeripheral", "Notified calories: $value")
    }

    fun notifyStatus(value: String) {
        val bytes = value.toByteArray()
        notifyCharacteristic(statusChar, bytes)
        Log.d("BlePeripheral", "Notified status: $value")
    }

    fun stop() {
        try {
            advertiser?.stopAdvertising(advertiseCallback)
        } catch (e: Exception) {
            Log.e("BlePeripheral", "Error stopAdvertising: ${e.message}")
        }
        gattServer?.close()
        gattServer?.clearServices()
        connectedDevices.clear()
        isAdvertising = false
        channel.invokeMethod("onStopped", true)
        Log.d("BlePeripheral", "BLE Peripheral stopped")
    }
}