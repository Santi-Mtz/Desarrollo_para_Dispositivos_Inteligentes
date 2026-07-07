package com.example.wearable_app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "ble_peripheral_channel"
    private var blePeripheral: BlePeripheral? = null
    private var methodChannel: MethodChannel? = null

    private var pendingStartResult: MethodChannel.Result? = null

    private val REQ_CODE_BLE_PERMS = 1001

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        methodChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)

        methodChannel?.setMethodCallHandler { call, result ->
            Log.d("BlePeripheral", "Method called: ${call.method}")
            when (call.method) {
                "start" -> {
                    Log.d("BlePeripheral", "Starting BLE peripheral")

                    if (hasBlePermissions()) {
                        blePeripheral = BlePeripheral(this, methodChannel!!)
                        blePeripheral?.start()
                        result.success(true)
                    } else {
                        pendingStartResult = result
                        requestBlePermissions()
                    }
                }
                "notifySteps" -> {
                    val value = call.argument<Int>("value") ?: 0
                    Log.d("BlePeripheral", "notifySteps: $value")
                    blePeripheral?.notifySteps(value)
                    result.success(true)
                }
                "notifyHeartRate" -> {
                    val value = call.argument<Int>("value") ?: 0
                    Log.d("BlePeripheral", "notifyHeartRate: $value")
                    blePeripheral?.notifyHeartRate(value)
                    result.success(true)
                }
                "notifyCalories" -> {
                    val value = call.argument<Int>("value") ?: 0
                    Log.d("BlePeripheral", "notifyCalories: $value")
                    blePeripheral?.notifyCalories(value)
                    result.success(true)
                }
                "notifyStatus" -> {
                    val value = call.argument<String>("value") ?: ""
                    Log.d("BlePeripheral", "notifyStatus: $value")
                    blePeripheral?.notifyStatus(value)
                    result.success(true)
                }
                "stop" -> {
                    Log.d("BlePeripheral", "Stopping BLE peripheral")
                    blePeripheral?.stop()
                    blePeripheral = null
                    pendingStartResult = null
                    result.success(true)
                }
                else -> {
                    Log.w("BlePeripheral", "Method not implemented: ${call.method}")
                    result.notImplemented()
                }
            }
        }
        Log.d("BlePeripheral", "Method channel handler registered")
    }

    private fun hasBlePermissions(): Boolean {
        val connectOk = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.BLUETOOTH_CONNECT
        ) == PackageManager.PERMISSION_GRANTED

        val advertiseOk = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.BLUETOOTH_ADVERTISE
        ) == PackageManager.PERMISSION_GRANTED

        return connectOk && advertiseOk
    }

    private fun requestBlePermissions() {
        Log.d("BlePeripheral", "Requesting BLE permissions")

        val permsToRequest = mutableListOf<String>()
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            permsToRequest.add(Manifest.permission.BLUETOOTH_CONNECT)
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_ADVERTISE) != PackageManager.PERMISSION_GRANTED) {
            permsToRequest.add(Manifest.permission.BLUETOOTH_ADVERTISE)
        }

        if (permsToRequest.isEmpty()) {
            pendingStartResult?.success(true)
            pendingStartResult = null
            return
        }

        ActivityCompat.requestPermissions(
            this,
            permsToRequest.toTypedArray(),
            REQ_CODE_BLE_PERMS
        )
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)

        if (requestCode != REQ_CODE_BLE_PERMS) return

        val granted = hasBlePermissions()
        Log.d("BlePeripheral", "BLE permissions granted=$granted")

        if (granted) {
            blePeripheral = BlePeripheral(this, methodChannel!!)
            blePeripheral?.start()
            pendingStartResult?.success(true)
        } else {
            pendingStartResult?.error("BLE_PERMISSIONS_DENIED", "BLE permissions denied", null)
        }
        pendingStartResult = null
    }
}

