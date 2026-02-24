# Document Location Implementation

## Overview
This guide implements the functionality to:
1. Display all scanned document locations on the MapActivity
2. Show the most recent deed location on the MainActivity dashboard

## Step 1: Create Location Data Model

### Create Location Data Class
Create `app/src/main/java/zw/co/tittledeedverifier/LocationData.kt`:

```kotlin
package zw.co.tittledeedverifier

import com.google.android.gms.maps.model.LatLng

data class DocumentLocation(
    val deedNumber: String,
    val location: LatLng,
    val address: String,
    val scanDate: String,
    val propertyDetails: String
)

object LocationRepository {
    // Sample data - replace with actual database/API calls
    private val locations = mutableListOf(
        DocumentLocation(
            deedNumber = "STAND 4829",
            location = LatLng(-17.8175, 31.0450),
            address = "Borrowdale, Harare",
            scanDate = "Today at 10:30 AM",
            propertyDetails = "Residential Stand"
        ),
        DocumentLocation(
            deedNumber = "STAND 1234",
            location = LatLng(-17.8275, 31.0550),
            address = "Avondale, Harare",
            scanDate = "Yesterday at 2:15 PM",
            propertyDetails = "Commercial Stand"
        ),
        DocumentLocation(
            deedNumber = "STAND 5678",
            location = LatLng(-17.8375, 31.0650),
            address = "Highlands, Harare",
            scanDate = "Feb 15, 2024",
            propertyDetails = "Residential Stand"
        )
    )

    fun getAllLocations(): List<DocumentLocation> = locations
    
    fun getMostRecentLocation(): DocumentLocation? = 
        locations.maxByOrNull { it.scanDate }
    
    fun addLocation(location: DocumentLocation) {
        locations.add(location)
    }
}
```

## Step 2: Update MapActivity to Show Document Locations

### Modify MapActivity.kt
Update the MapScreen composable to load and display document locations:

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen() {
    val harare = LatLng(-17.8175, 31.0450)
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(harare, 12f)
    }
    
    var isLocationEnabled by remember { mutableStateOf(false) }
    val documentLocations = remember { LocationRepository.getAllLocations() }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = stringResource(R.string.land_registry_map),
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Bold
                        ),
                        color = MaterialTheme.colorScheme.primary
                    )
                },
                // ... rest of top bar code
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
                // Real Google Map View
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(300.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                    shape = MaterialTheme.shapes.large
                ) {
                    GoogleMap(
                        modifier = Modifier.fillMaxSize(),
                        cameraPositionState = cameraPositionState,
                        properties = MapProperties(
                            mapType = MapType.NORMAL,
                            isMyLocationEnabled = isLocationEnabled
                        ),
                        uiSettings = MapUiSettings(
                            zoomControlsEnabled = true,
                            compassEnabled = true,
                            myLocationButtonEnabled = true
                        )
                    ) {
                        // Display all document locations
                        documentLocations.forEach { docLocation ->
                            Marker(
                                state = MarkerState(position = docLocation.location),
                                title = docLocation.deedNumber,
                                snippet = "${docLocation.address}\n${docLocation.scanDate}",
                                onClick = {
                                    // Handle marker click - show details
                                    true
                                }
                            )
                        }
                    }
                }
                
                Spacer(Modifier.height(16.dp))
                
                // Map Features
                Text(
                    text = "Map Features",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold
                    ),
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(bottom = 12.dp)
                )
                
                // Feature cards
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    MapFeatureCard(
                        title = "Search Parcels",
                        description = "Find specific land parcels",
                        icon = R.drawable.ic_launcher_foreground,
                        modifier = Modifier.weight(1f)
                    )
                    MapFeatureCard(
                        title = "View Boundaries",
                        description = "See property boundaries",
                        icon = R.drawable.ic_launcher_foreground,
                        modifier = Modifier.weight(1f)
                    )
                }
                
                Spacer(Modifier.height(16.dp))
                
                // Recent Searches
                Text(
                    text = "Recent Searches",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold
                    ),
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(bottom = 12.dp)
                )
                
                // Display recent document searches
                documentLocations.take(5).forEach { docLocation ->
                    RecentSearchItem(
                        location = "${docLocation.deedNumber}, ${docLocation.address}",
                        date = docLocation.scanDate
                    )
                }
            }
        }
    }
}
```

## Step 3: Update MainActivity to Show Most Recent Location

### Add Location Display to Dashboard
In MainActivity.kt, add a location card to the dashboard:

```kotlin
@Composable
fun DashboardContent() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // ... existing dashboard items
        
        // Most Recent Deed Location
        LocationCard()
        
        Spacer(Modifier.height(16.dp))
        
        // ... rest of dashboard
    }
}

@Composable
fun LocationCard() {
    val recentLocation = LocationRepository.getMostRecentLocation()
    
    if (recentLocation != null) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primary
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
            shape = MaterialTheme.shapes.large
        ) {
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(60.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_launcher_foreground),
                        contentDescription = "Location",
                        tint = Color.White,
                        modifier = Modifier.size(30.dp)
                    )
                }
                
                Spacer(Modifier.width(16.dp))
                
                Column(
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        text = "Most Recent Deed Location",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold
                        ),
                        color = Color.White
                    )
                    Text(
                        text = "${recentLocation.deedNumber} - ${recentLocation.address}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.White.copy(alpha = 0.9f)
                    )
                    Text(
                        text = "Scanned: ${recentLocation.scanDate}",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.8f)
                    )
                }
                
                IconButton(
                    onClick = { /* Navigate to MapActivity */ },
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.2f))
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_launcher_foreground),
                        contentDescription = "View on Map",
                        tint = Color.White
                    )
                }
            }
        }
    } else {
        // Show empty state
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
            shape = MaterialTheme.shapes.large
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    painter = painterResource(id = R.drawable.ic_launcher_foreground),
                    contentDescription = "No locations",
                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                )
                Text(
                    text = "No scanned documents yet",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
            }
        }
    }
}
```

## Step 4: Add Location to Scanned Documents

### Update ResultActivity to Save Location
When a document is successfully scanned, save its location:

```kotlin
// In ResultActivity, after successful verification
private fun saveDocumentLocation(deedNumber: String, locationData: String) {
    // Extract coordinates from location data or use default
    val coordinates = extractCoordinates(locationData) 
        ?: LatLng(-17.8175, 31.0450) // Default to Harare
    
    val documentLocation = DocumentLocation(
        deedNumber = deedNumber,
        location = coordinates,
        address = getLocationAddress(coordinates),
        scanDate = getCurrentDateTime(),
        propertyDetails = "Verified Document"
    )
    
    LocationRepository.addLocation(documentLocation)
}

private fun extractCoordinates(locationData: String): LatLng? {
    // Parse coordinates from location data
    // Return LatLng if found, null otherwise
    return null
}

private fun getLocationAddress(coordinates: LatLng): String {
    // Reverse geocode coordinates to address
    // For now, return a default address
    return "Harare, Zimbabwe"
}

private fun getCurrentDateTime(): String {
    val formatter = SimpleDateFormat("MMM dd, yyyy 'at' hh:mm a", Locale.getDefault())
    return formatter.format(Date())
}
```

## Step 5: Add Map Navigation

### Update Navigation in MainActivity
Add navigation to MapActivity:

```kotlin
// In the LocationCard IconButton onClick
onClick = {
    // Navigate to MapActivity
    // This depends on your navigation setup
    // If using Compose Navigation:
    navController.navigate("map")
}
```

## Step 6: Testing

### Test the Implementation
1. **Scan a document** - location should be saved
2. **Check MainActivity** - most recent location should appear
3. **Open MapActivity** - all document locations should show as markers
4. **Click markers** - should show document details

## Database Integration (Optional)

For persistent storage, consider adding Room database:

```kotlin
// Add to build.gradle.kts
implementation("androidx.room:room-runtime:2.6.1")
kapt("androidx.room:room-compiler:2.6.1")

// Create database entities and DAO
@Entity(tableName = "document_locations")
data class DocumentLocationEntity(
    @PrimaryKey val deedNumber: String,
    val latitude: Double,
    val longitude: Double,
    val address: String,
    val scanDate: String,
    val propertyDetails: String
)
```

## Next Steps

1. **Implement real location detection** from document images
2. **Add database persistence** for document locations
3. **Improve location accuracy** with GPS coordinates
4. **Add search functionality** to find specific documents on map
5. **Implement clustering** for dense areas with many documents

This implementation provides a complete foundation for displaying document locations on both the map and dashboard.