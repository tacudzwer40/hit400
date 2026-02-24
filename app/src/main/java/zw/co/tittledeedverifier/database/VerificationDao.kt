package zw.co.tittledeedverifier.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface VerificationDao {
    @Query("SELECT * FROM verification_records ORDER BY timestamp DESC")
    fun getAllRecords(): Flow<List<VerificationRecord>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecord(record: VerificationRecord)

    @Query("SELECT * FROM verification_records WHERE isSynced = 0")
    suspend fun getUnsyncedRecords(): List<VerificationRecord>

    @Query("UPDATE verification_records SET isSynced = 1 WHERE id = :id")
    suspend fun markAsSynced(id: Int)
}
