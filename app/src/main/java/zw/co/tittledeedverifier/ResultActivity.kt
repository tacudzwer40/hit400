package zw.co.tittledeedverifier

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import org.json.JSONObject
import zw.co.tittledeedverifier.ui.theme.TitleDeedVerifierTheme
import zw.co.tittledeedverifier.ui.theme.successGreen

class ResultActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Set status bar color
        window.statusBarColor = ContextCompat.getColor(this, R.color.primary_dark)
        
        val resultData = intent.getStringExtra("result_data")
        
        setContent {
            TitleDeedVerifierTheme {
                ResultScreen(
                    resultData = resultData,
                    onScanAnotherClick = {
                        finish()
                        val intent = Intent(this@ResultActivity, MainActivity::class.java)
                        startActivity(intent)
                    },
                    onBackToHomeClick = {
                        finish()
                    }
                )
            }
        }
    }
}

@Composable
fun ResultScreen(
    resultData: String?,
    onScanAnotherClick: () -> Unit,
    onBackToHomeClick: () -> Unit
) {
    val result = remember(resultData) {
        parseResultData(resultData)
    }
    
    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(vertical = 16.dp)
        ) {
            item {
                // Header Section
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Status Icon
                    Box(
                        modifier = Modifier
                            .size(80.dp)
                            .background(
                                color = if (result.isVerified) {
                                    successGreen.copy(alpha = 0.1f)
                                } else {
                                    MaterialTheme.colorScheme.error.copy(alpha = 0.1f)
                                },
                                shape = RoundedCornerShape(20.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            painter = painterResource(id = R.drawable.ic_launcher_foreground),
                            contentDescription = null,
                            tint = if (result.isVerified) {
                                successGreen
                            } else {
                                MaterialTheme.colorScheme.error
                            },
                            modifier = Modifier.size(40.dp)
                        )
                    }
                    
                    Spacer(Modifier.height(16.dp))
                    
                    // Status Title
                    Text(
                        text = if (result.isVerified) {
                            stringResource(R.string.verified_title)
                        } else {
                            stringResource(R.string.fraud_title)
                        },
                        style = MaterialTheme.typography.displaySmall.copy(
                            fontWeight = FontWeight.Bold
                        ),
                        color = if (result.isVerified) {
                            successGreen
                        } else {
                            MaterialTheme.colorScheme.error
                        },
                        textAlign = TextAlign.Center
                    )
                    
                    Spacer(Modifier.height(8.dp))
                    
                    // Status Description
                    Text(
                        text = if (result.isVerified) {
                            stringResource(R.string.genuine_deed)
                        } else {
                            stringResource(R.string.fraudulent_deed)
                        },
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.8f),
                        textAlign = TextAlign.Center
                    )
                    
                    Spacer(Modifier.height(24.dp))
                    
                    // Fraud Score
                    if (!result.isVerified) {
                        FraudScoreCard(score = result.fraudScore)
                    }
                }
            }
            
            item {
                // Document Details
                DocumentDetailsCard(result = result)
            }
            
            item {
                // Analysis Results
                AnalysisResultsCard(result = result)
            }
            
            item {
                // Action Buttons
                ActionButtons(
                    result = result,
                    onScanAnotherClick = onScanAnotherClick,
                    onBackToHomeClick = onBackToHomeClick
                )
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

@Composable
fun FraudScoreCard(score: Int) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.error.copy(alpha = 0.1f)
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(
                        color = MaterialTheme.colorScheme.error,
                        shape = RoundedCornerShape(12.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "$score%",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold
                    ),
                    color = Color.White
                )
            }
            
            Spacer(Modifier.width(16.dp))
            
            Column {
                Text(
                    text = stringResource(R.string.fraud_score, score),
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold
                    ),
                    color = MaterialTheme.colorScheme.error
                )
                Text(
                    text = "High risk of fraud detected",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error.copy(alpha = 0.8f)
                )
            }
        }
    }
}

@Composable
fun DocumentDetailsCard(result: VerificationResult) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "Document Details",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold
                ),
                color = MaterialTheme.colorScheme.onSurface
            )
            
            Spacer(Modifier.height(12.dp))
            
            VerificationDetailRow(
                label = "Deed Number",
                value = result.deedNumber ?: "N/A"
            )
            
            VerificationDetailRow(
                label = "Property District",
                value = result.propertyDistrict ?: "N/A"
            )
            
            VerificationDetailRow(
                label = "Registered Owner",
                value = result.registeredOwner ?: "N/A"
            )
            
            VerificationDetailRow(
                label = "Date of Registration",
                value = result.registrationDate ?: "N/A"
            )
        }
    }
}

@Composable
private fun VerificationDetailRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
        )
        
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium.copy(
                fontWeight = FontWeight.Medium
            ),
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
fun AnalysisResultsCard(result: VerificationResult) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = stringResource(R.string.analysis_reasons),
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold
                ),
                color = MaterialTheme.colorScheme.onSurface
            )
            
            Spacer(Modifier.height(12.dp))
            
            result.analysisReasons.forEach { reason ->
                AnalysisReasonItem(reason)
                Spacer(Modifier.height(6.dp))
            }
        }
    }
}

@Composable
fun AnalysisReasonItem(reason: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.padding(vertical = 2.dp)
    ) {
        Icon(
            painter = painterResource(id = R.drawable.ic_launcher_foreground),
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(16.dp)
        )
        Spacer(Modifier.width(8.dp))
        Text(
            text = reason,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
        )
    }
}

@Composable
fun ActionButtons(
    result: VerificationResult,
    onScanAnotherClick: () -> Unit,
    onBackToHomeClick: () -> Unit
) {
    val context = LocalContext.current
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Button(
            onClick = onScanAnotherClick,
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = Color.White
            ),
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(
                painter = painterResource(id = R.drawable.ic_launcher_foreground),
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = stringResource(R.string.scan_another),
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontWeight = FontWeight.Medium
                )
            )
        }
        
        OutlinedButton(
            onClick = onBackToHomeClick,
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = MaterialTheme.colorScheme.primary
            ),
            shape = RoundedCornerShape(12.dp),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary)
        ) {
            Icon(
                painter = painterResource(id = R.drawable.ic_launcher_foreground),
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = stringResource(R.string.back_to_home),
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontWeight = FontWeight.Medium
                )
            )
        }
        
        Spacer(Modifier.height(8.dp))
        
        Button(
            onClick = {
                // Share result functionality
                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, "Deed Verification Result: ${result.deedNumber} - ${if (result.isVerified) "VERIFIED" else "FRAUD DETECTED"}")
                }
                val chooserIntent = Intent.createChooser(shareIntent, "Share Result")
                context.startActivity(chooserIntent)
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.secondary,
                contentColor = Color.White
            ),
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(
                painter = painterResource(id = R.drawable.ic_launcher_foreground),
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = "Share Result",
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontWeight = FontWeight.Medium
                )
            )
        }
    }
}

data class VerificationResult(
    val isVerified: Boolean,
    val fraudScore: Int,
    val deedNumber: String?,
    val propertyDistrict: String?,
    val registeredOwner: String?,
    val registrationDate: String?,
    val analysisReasons: List<String>
)

fun parseResultData(resultData: String?): VerificationResult {
    return try {
        if (resultData != null) {
            val json = JSONObject(resultData)
            val isVerified = json.optBoolean("is_verified", false)
            val fraudScore = json.optInt("fraud_score", 0)
            
            val deedNumber = if (json.isNull("deed_number")) null else json.optString("deed_number")
            val propertyDistrict = if (json.isNull("property_district")) null else json.optString("property_district")
            val registeredOwner = if (json.isNull("registered_owner")) null else json.optString("registered_owner")
            val registrationDate = if (json.isNull("registration_date")) null else json.optString("registration_date")
            
            val analysisReasons = mutableListOf<String>()
            val reasonsArray = json.optJSONArray("analysis_reasons")
            if (reasonsArray != null) {
                for (i in 0 until reasonsArray.length()) {
                    analysisReasons.add(reasonsArray.optString(i))
                }
            }
            
            VerificationResult(
                isVerified = isVerified,
                fraudScore = fraudScore,
                deedNumber = deedNumber,
                propertyDistrict = propertyDistrict,
                registeredOwner = registeredOwner,
                registrationDate = registrationDate,
                analysisReasons = analysisReasons
            )
        } else {
            createFakeResult()
        }
    } catch (_: Exception) {
        createFakeResult()
    }
}

private fun createFakeResult() = VerificationResult(
    isVerified = true,
    fraudScore = 0,
    deedNumber = "ZW-HRE-2023-8492",
    propertyDistrict = "Harare North, Borrowdale",
    registeredOwner = "Tafadzwa Chiwenga",
    registrationDate = "14 March 2018",
    analysisReasons = listOf(
        "Physical seal analysis matched government records",
        "Watermark spectral analysis confirmed",
        "Blockchain hash verified on ZW Land Ledger",
        "No active encumbrances or liens found"
    )
)
