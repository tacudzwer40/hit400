package zw.co.tittledeedverifier

data class HistoryItem(
    val deedNumber: String,
    val location: String,
    val date: String,
    val isVerified: Boolean,
    val score: Int,
    val latitude: Double,
    val longitude: Double
)
