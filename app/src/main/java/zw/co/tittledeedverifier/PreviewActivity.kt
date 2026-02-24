package zw.co.tittledeedverifier

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.util.Base64
import android.util.Log
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import zw.co.tittledeedverifier.database.AppDatabase
import zw.co.tittledeedverifier.database.VerificationRecord
import zw.co.tittledeedverifier.ml.ForgeryDetectionEngine
import zw.co.tittledeedverifier.network.RetrofitInstance
import zw.co.tittledeedverifier.network.VerificationRequest
import zw.co.tittledeedverifier.network.VerificationResponse
import java.io.ByteArrayOutputStream
import java.io.File

class PreviewActivity : ComponentActivity() {

    companion object {
        private const val TAG = "PreviewActivity"
    }

    private var photoPath: String? = null
    private lateinit var mlEngine: ForgeryDetectionEngine
    private lateinit var database: AppDatabase

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = ContextCompat.getColor(this, R.color.primary_dark)
        
        photoPath = intent.getStringExtra("photo_path")
        mlEngine = ForgeryDetectionEngine(this)
        database = AppDatabase.getDatabase(this)
        
        setContent {
            PreviewScreen(
                photoPath = photoPath,
                onRetakeClick = { finish() },
                onVerifyClick = { path ->
                    processVerification(path)
                }
            )
        }
    }

    private fun processVerification(photoPath: String?) {
        if (photoPath == null) return

        lifecycleScope.launch {
            try {
                // 1. Run local AI analysis (Objective 1)
                val aiResult = mlEngine.analyzeImage(photoPath)
                
                // 2. Check connectivity
                val isOnline = isNetworkAvailable(this@PreviewActivity)
                
                var blockchainTxId: String? = null
                
                if (isOnline) {
                    // 3. Sync with Blockchain (Objective 2)
                    try {
                        val base64Image = withContext(Dispatchers.IO) { encodeImageToBase64(photoPath) }
                        if (base64Image != null) {
                            val request = VerificationRequest(imageData = base64Image)
                            val response = withContext(Dispatchers.IO) {
                                RetrofitInstance.api.verifyDeed(request)
                            }
                            blockchainTxId = response.blockchainTxId
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Blockchain sync failed", e)
                    }
                }

                // 4. Save to local Room DB (Objective 3 - Offline first)
                val record = VerificationRecord(
                    deedNumber = aiResult.detectedDeedNumber,
                    propertyDistrict = "Pending Analysis",
                    registeredOwner = "Analyzed Locally",
                    registrationDate = "N/A",
                    isVerified = aiResult.isAuthentic,
                    fraudScore = aiResult.forgeryScore,
                    blockchainTxId = blockchainTxId,
                    isSynced = blockchainTxId != null
                )
                
                withContext(Dispatchers.IO) {
                    database.verificationDao().insertRecord(record)
                }

                // 5. Show results
                val resultResponse = VerificationResponse(
                    isVerified = aiResult.isAuthentic,
                    fraudScore = aiResult.forgeryScore,
                    deedNumber = aiResult.detectedDeedNumber,
                    propertyDistrict = "Analyzed Locally",
                    registeredOwner = "Analyzed Locally",
                    registrationDate = "N/A",
                    analysisReasons = listOf(
                        "Local AI analysis complete",
                        if (aiResult.stampDetected) "Government stamp detected" else "Stamp missing or forged",
                        "Signature match: ${aiResult.signatureMatch}%",
                        if (blockchainTxId != null) "Blockchain hash verified: $blockchainTxId" else "Pending blockchain sync (Offline mode)"
                    ),
                    blockchainTxId = blockchainTxId,
                    timestamp = System.currentTimeMillis().toString()
                )

                val intent = Intent(this@PreviewActivity, ResultActivity::class.java).apply {
                    putExtra("result_data", Gson().toJson(resultResponse))
                }
                startActivity(intent)
                finish()

            } catch (e: Exception) {
                Log.e(TAG, "Process error", e)
                Toast.makeText(this@PreviewActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun encodeImageToBase64(path: String): String? {
        return try {
            val bm = BitmapFactory.decodeFile(path)
            val baos = ByteArrayOutputStream()
            bm.compress(Bitmap.CompressFormat.JPEG, 70, baos)
            val b = baos.toByteArray()
            Base64.encodeToString(b, Base64.DEFAULT)
        } catch (e: Exception) {
            null
        }
    }

    private fun isNetworkAvailable(context: Context): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork
        val capabilities = connectivityManager.getNetworkCapabilities(network)
        return capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
    }

    override fun onDestroy() {
        super.onDestroy()
        mlEngine.close()
    }
}

@Composable
fun PreviewScreen(
    photoPath: String?,
    onRetakeClick: () -> Unit,
    onVerifyClick: (String?) -> Unit
) {
    var isProcessing by remember { mutableStateOf(false) }
    var bitmap by remember { mutableStateOf<Bitmap?>(null) }
    
    LaunchedEffect(photoPath) {
        photoPath?.let { path ->
            withContext(Dispatchers.IO) {
                val loadedBitmap = BitmapFactory.decodeFile(path)
                bitmap = loadedBitmap
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Image(
            painter = painterResource(id = R.drawable.logo),
            contentDescription = null,
            modifier = Modifier.fillMaxSize().graphicsLayer(alpha = 0.4f),
            contentScale = ContentScale.Crop
        )

        Scaffold(
            modifier = Modifier.fillMaxSize(),
            containerColor = Color.Transparent
        ) { padding ->
            Column(
                modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                // Header
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.9f))
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = onRetakeClick) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color(0xFF006D3E))
                        }
                        Column {
                            Text("Verify Document", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Text("Running AI Analysis...", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }

                // Image Preview
                Card(
                    modifier = Modifier.fillMaxWidth().weight(1f).padding(vertical = 16.dp),
                    shape = RoundedCornerShape(24.dp),
                    elevation = CardDefaults.cardElevation(8.dp)
                ) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        if (bitmap != null) {
                            androidx.compose.foundation.Image(
                                bitmap = bitmap!!.asImageBitmap(),
                                contentDescription = "Preview",
                                contentScale = ContentScale.Fit,
                                modifier = Modifier.fillMaxSize().padding(16.dp)
                            )
                        } else {
                            CircularProgressIndicator(color = Color(0xFF006D3E))
                        }
                    }
                }

                // Action Buttons
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(
                        onClick = onRetakeClick,
                        modifier = Modifier.weight(1f).height(56.dp),
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, Color(0xFF006D3E))
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, tint = Color(0xFF006D3E))
                        Spacer(Modifier.width(8.dp))
                        Text("Retake", color = Color(0xFF006D3E))
                    }

                    Button(
                        onClick = {
                            isProcessing = true
                            onVerifyClick(photoPath)
                        },
                        modifier = Modifier.weight(2f).height(56.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF006D3E)),
                        enabled = !isProcessing
                    ) {
                        if (isProcessing) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White)
                        } else {
                            Icon(Icons.Default.CloudUpload, contentDescription = null)
                            Spacer(Modifier.width(8.dp))
                            Text("Run AI Verification", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
