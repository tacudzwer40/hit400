package zw.co.tittledeedverifier.network

import com.google.gson.annotations.SerializedName

data class VerificationResponse(
    @SerializedName("is_verified")
    val isVerified: Boolean,
    
    @SerializedName("fraud_score")
    val fraudScore: Int,
    
    @SerializedName("deed_number")
    val deedNumber: String?,
    
    @SerializedName("property_district")
    val propertyDistrict: String?,
    
    @SerializedName("registered_owner")
    val registeredOwner: String?,
    
    @SerializedName("registration_date")
    val registrationDate: String?,
    
    @SerializedName("analysis_reasons")
    val analysisReasons: List<String>,
    
    @SerializedName("blockchain_tx_id")
    val blockchainTxId: String?,
    
    @SerializedName("timestamp")
    val timestamp: String?
)
