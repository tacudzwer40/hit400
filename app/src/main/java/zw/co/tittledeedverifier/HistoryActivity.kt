package zw.co.tittledeedverifier

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.FileDownload
import androidx.compose.material.icons.filled.Map
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat

class HistoryActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Set status bar color
        window.statusBarColor = ContextCompat.getColor(this, R.color.primary_dark)
        
        setContent {
            HistoryScreen(onBack = { finish() })
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(onBack: () -> Unit) {
    val context = LocalContext.current

    Image(
        painter = painterResource(id = R.drawable.background),
        contentDescription = null,
        modifier = Modifier
            .fillMaxSize()
            .graphicsLayer(alpha = 0.4f),
        contentScale = ContentScale.Crop
    )
    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = stringResource(R.string.scan_history),
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Bold
                        )
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.primary,
                    navigationIconContentColor = MaterialTheme.colorScheme.primary
                )
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            item {
                // Summary Cards
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    SummaryCard(
                        title = "Total Scans",
                        value = "150",
                        icon = Icons.Default.CheckCircle,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.weight(1f)
                    )
                    SummaryCard(
                        title = "Verified",
                        value = "142",
                        icon = Icons.Default.CheckCircle,
                        color = Color(0xFF22C55E),
                        modifier = Modifier.weight(1f)
                    )
                }
                
                Spacer(Modifier.height(8.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    SummaryCard(
                        title = "Fraud Detected",
                        value = "8",
                        icon = Icons.Default.Cancel,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.weight(1f)
                    )
                    SummaryCard(
                        title = "Pending",
                        value = "0",
                        icon = Icons.Default.CheckCircle,
                        color = MaterialTheme.colorScheme.secondary,
                        modifier = Modifier.weight(1f)
                    )
                }
                
                Spacer(Modifier.height(24.dp))
                
                // History List Title
                Text(
                    text = "Recent Verifications",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold
                    ),
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(bottom = 12.dp)
                )
            }
            
            // History Items
            items(getSampleHistory()) { historyItem ->
                HistoryItemCard(historyItem) {
                    val intent = Intent(context, MapActivity::class.java).apply {
                        putExtra("latitude", historyItem.latitude)
                        putExtra("longitude", historyItem.longitude)
                    }
                    context.startActivity(intent)
                }
                Spacer(Modifier.height(8.dp))
            }
        }
    }
}

@Composable
fun SummaryCard(
    title: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .height(90.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            verticalArrangement = Arrangement.Center
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            }
            Spacer(Modifier.height(4.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

@Composable
fun HistoryItemCard(historyItem: HistoryItem, onClick: () -> Unit) {
    val context = LocalContext.current
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = MaterialTheme.shapes.medium
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = historyItem.deedNumber,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                
                Spacer(Modifier.height(4.dp))
                
                Text(
                    text = historyItem.location,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
                
                Spacer(Modifier.height(4.dp))
                
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(if (historyItem.isVerified) Color(0xFF22C55E) else Color.Red)
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        text = if (historyItem.isVerified) "Verified" else "Fraud Suspected",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (historyItem.isVerified) Color(0xFF166534) else Color.Red
                    )
                }
            }
            
                IconButton(
                    onClick = onClick,
                    colors = IconButtonDefaults.iconButtonColors(
                        containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Map,
                        contentDescription = "View on map",
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
                
                Spacer(Modifier.width(8.dp))
                
                IconButton(
                    onClick = {
                        // Download report functionality
                        Toast.makeText(context, "Downloading report for ${historyItem.deedNumber}...", Toast.LENGTH_SHORT).show()
                    },
                    colors = IconButtonDefaults.iconButtonColors(
                        containerColor = MaterialTheme.colorScheme.secondary.copy(alpha = 0.1f)
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.FileDownload,
                        contentDescription = "Download report",
                        tint = MaterialTheme.colorScheme.secondary
                    )
                }
        }
    }
}

fun getSampleHistory(): List<HistoryItem> {
    return listOf(
        HistoryItem(
            deedNumber = "ZW-HRE-2023-8492",
            location = "Harare North, Borrowdale",
            date = "Today at 09:42 AM",
            isVerified = true,
            score = 98,
            latitude = -17.75,
            longitude = 31.10
        ),
        HistoryItem(
            deedNumber = "ZW-BYO-2022-1102",
            location = "Bulawayo Central",
            date = "Yesterday at 3:15 PM",
            isVerified = false,
            score = 12,
            latitude = -20.15,
            longitude = 28.58
        ),
        HistoryItem(
            deedNumber = "ZW-MUT-2023-0045",
            location = "Mutare, Greenside",
            date = "Feb 16, 2024 at 11:30 AM",
            isVerified = true,
            score = 99,
            latitude = -18.97,
            longitude = 32.67
        ),
        HistoryItem(
            deedNumber = "ZW-HRE-2021-5521",
            location = "Harare, Avondale",
            date = "Feb 15, 2024 at 2:45 PM",
            isVerified = false,
            score = 65,
            latitude = -17.80,
            longitude = 31.03
        ),
        HistoryItem(
            deedNumber = "ZW-MAS-2023-3321",
            location = "Masvingo, City Center",
            date = "Feb 14, 2024 at 9:20 AM",
            isVerified = true,
            score = 95,
            latitude = -20.06,
            longitude = 30.83
        )
    )
}
