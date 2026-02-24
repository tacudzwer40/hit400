package zw.co.tittledeedverifier.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "verification_records")
data class VerificationRecord(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val deedNumber: String?,
    val propertyDistrict: String?,
    val registeredOwner: String?,
    val registrationDate: String?,
    val isVerified: Boolean,
    val fraudScore: Int,
    val blockchainTxId: String?,
    val timestamp: Long = System.currentTimeMillis(),
    val isSynced: Boolean = false
)
