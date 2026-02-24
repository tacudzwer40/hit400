package zw.co.tittledeedverifier.network

import retrofit2.http.Body
import retrofit2.http.POST

interface BlockchainApi {
    @POST("api/verify")
    suspend fun verifyDeed(@Body request: VerificationRequest): VerificationResponse
}
