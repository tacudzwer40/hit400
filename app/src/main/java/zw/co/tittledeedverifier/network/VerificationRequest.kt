package zw.co.tittledeedverifier.network

import com.google.gson.annotations.SerializedName

data class VerificationRequest(
    @SerializedName("image_data")
    val imageData: String // Base64 encoded image string
)
