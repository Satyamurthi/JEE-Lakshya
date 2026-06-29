package com.neetlakshya.app

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.SslErrorHandler
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONArray

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private var isErrorOccurred = false

    // Current local version code of this compiled application
    private val currentVersionCode = 2

    // Default target URL for NEET Lakshya & JEE Nexus Platform
    private val appUrl = "https://jeelakshya.netlify.app"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Automatically hide notification bar and navigation bar for immersive CBT test environment
        hideSystemUI()

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)

        // Retrieve integrated database credentials from env_config.xml
        val supabaseUrl = getString(R.string.supabase_url)
        val supabaseKey = getString(R.string.supabase_anon_key)
        val neetUrl = getString(R.string.neet_supabase_url)
        val neetKey = getString(R.string.neet_supabase_anon_key)
        val razorpayKey = getString(R.string.razorpay_key_id)

        // Check for updates from Supabase backend in background
        checkForAppUpdates(supabaseUrl, supabaseKey)

        // Configure high-performance resilient WebView settings
        val webSettings: WebSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.databaseEnabled = true
        webSettings.allowFileAccess = true
        webSettings.allowContentAccess = true
        webSettings.loadWithOverviewMode = true
        webSettings.useWideViewPort = true
        webSettings.builtInZoomControls = false
        webSettings.displayZoomControls = false
        webSettings.setSupportZoom(false)
        webSettings.cacheMode = WebSettings.LOAD_DEFAULT
        webSettings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        // Setup custom resilient WebView client
        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                isErrorOccurred = false
                progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                if (!isErrorOccurred) {
                    progressBar.visibility = View.GONE
                }

                // Inject integrated environment credentials into WebView localStorage
                val injectJs = """
                    javascript:(function() {
                        try {
                            localStorage.setItem('VITE_SUPABASE_URL', '$supabaseUrl');
                            localStorage.setItem('VITE_SUPABASE_ANON_KEY', '$supabaseKey');
                            localStorage.setItem('VITE_NEET_SUPABASE_URL', '$neetUrl');
                            localStorage.setItem('VITE_NEET_SUPABASE_ANON_KEY', '$neetKey');
                            localStorage.setItem('VITE_RAZORPAY_KEY_ID', '$razorpayKey');
                        } catch(e) { console.log('Config inject error', e); }
                    })()
                """.trimIndent()
                view?.evaluateJavascript(injectJs, null)
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                // Keep app navigation within jeelakshya.netlify.app internal
                if (url.contains("jeelakshya.netlify.app") || url.contains("netlify.app")) {
                    return false
                }
                // Open external links in system browser
                return try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                    true
                } catch (e: Exception) {
                    false
                }
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    isErrorOccurred = true
                    progressBar.visibility = View.GONE
                    // Auto-recovery: Silent retry after 3 seconds on network connection drop
                    Handler(Looper.getMainLooper()).postDelayed({
                        if (isErrorOccurred && !isFinishing) {
                            view?.loadUrl(appUrl)
                        }
                    }, 3000)
                }
            }

            override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
                // Proceed smoothly through minor SSL handshake redirects
                handler?.proceed()
            }
        }

        // Load application
        if (savedInstanceState == null) {
            webView.loadUrl(appUrl)
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    private fun checkForAppUpdates(baseUrl: String, apiKey: String) {
        Thread {
            try {
                val endpoint = "$baseUrl/rest/v1/app_versions?select=*&order=version_code.desc&limit=1"
                val url = java.net.URL(endpoint)
                val connection = url.openConnection() as java.net.HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("apikey", apiKey)
                connection.setRequestProperty("Authorization", "Bearer $apiKey")
                connection.connectTimeout = 5000
                connection.readTimeout = 5000

                if (connection.responseCode == java.net.HttpURLConnection.HTTP_OK) {
                    val reader = java.io.BufferedReader(java.io.InputStreamReader(connection.inputStream))
                    val response = StringBuilder()
                    var line: String?
                    while (reader.readLine().also { line = it } != null) {
                        response.append(line)
                    }
                    reader.close()

                    val jsonArray = JSONArray(response.toString())
                    if (jsonArray.length() > 0) {
                        val latestVersion = jsonArray.getJSONObject(0)
                        val remoteVersionCode = latestVersion.getInt("version_code")
                        val versionName = latestVersion.getString("version_name")
                        val apkUrl = latestVersion.getString("apk_url")
                        val changelog = latestVersion.optString("changelog", "New performance updates available.")
                        val isForceUpdate = latestVersion.optBoolean("is_force_update", false)

                        if (remoteVersionCode > currentVersionCode) {
                            Handler(Looper.getMainLooper()).post {
                                showUpdateDialog(versionName, changelog, apkUrl, isForceUpdate)
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }.start()
    }

    private fun showUpdateDialog(versionName: String, changelog: String, apkUrl: String, isForceUpdate: Boolean) {
        val builder = AlertDialog.Builder(this)
            .setTitle("🚀 Update Available! (v$versionName)")
            .setMessage("A new version of NEET Lakshya & JEE Nexus is ready for installation.\n\nWhat's New:\n$changelog")
            .setCancelable(!isForceUpdate)
            .setPositiveButton("Update Now") { _, _ ->
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(apkUrl))
                    startActivity(intent)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }

        if (!isForceUpdate) {
            builder.setNegativeButton("Later") { dialog, _ ->
                dialog.dismiss()
            }
        }

        val dialog = builder.create()
        dialog.show()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            hideSystemUI()
        }
    }

    private fun hideSystemUI() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }
}
