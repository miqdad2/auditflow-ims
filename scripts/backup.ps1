# RECAFCO AuditFlow IMS — Windows Backup Script
# Backs up the PostgreSQL database and the uploads folder.
# Run this script manually or schedule it with Windows Task Scheduler.
#
# Prerequisites:
#   - pg_dump must be in PATH (installed with PostgreSQL client tools)
#   - The POSTGRES_* variables below must match your .env configuration
#   - PowerShell 5.1 or later
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\backup.ps1
#
# WARNING: A database backup without the uploads folder is INCOMPLETE.
# Both must be backed up together to allow a full restore.

param(
    [string]$BackupRoot = "C:\AuditFlowBackups",
    [string]$PgHost     = "localhost",
    [string]$PgPort     = "5432",
    [string]$PgDb       = "auditflow_ims",
    [string]$PgUser     = "postgres",
    [string]$UploadsDir = (Join-Path $PSScriptRoot "..\uploads")
)

# ── Configuration ────────────────────────────────────────────────────────────

$Timestamp  = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupDir  = Join-Path $BackupRoot $Timestamp
$DbDumpFile = Join-Path $BackupDir "auditflow_db.sql"
$UploadsZip = Join-Path $BackupDir "auditflow_uploads.zip"
$LogFile    = Join-Path $BackupDir "backup.log"

# ── Helpers ──────────────────────────────────────────────────────────────────

function Write-Log {
    param([string]$Msg, [string]$Level = "INFO")
    $Line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Msg"
    Write-Host $Line
    Add-Content -Path $LogFile -Value $Line
}

function Exit-Failure {
    param([string]$Msg)
    Write-Log $Msg "ERROR"
    Write-Log "Backup FAILED. Check $LogFile for details." "ERROR"
    exit 1
}

# ── Setup ────────────────────────────────────────────────────────────────────

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
Write-Log "Backup started — destination: $BackupDir"

# ── Step 1: PostgreSQL dump ───────────────────────────────────────────────────

Write-Log "Starting database backup (pg_dump)..."

# Set PGPASSWORD for non-interactive authentication.
# For production, prefer a .pgpass file or PGPASSFILE env var instead.
if (-not $env:PGPASSWORD) {
    Write-Log "PGPASSWORD environment variable is not set. pg_dump may prompt for a password." "WARNING"
    Write-Log "Set PGPASSWORD before running this script, or use a .pgpass file." "WARNING"
}

$pgDumpArgs = @(
    "--host=$PgHost",
    "--port=$PgPort",
    "--username=$PgUser",
    "--dbname=$PgDb",
    "--format=plain",
    "--no-password",
    "--file=$DbDumpFile"
)

& pg_dump @pgDumpArgs
if ($LASTEXITCODE -ne 0) {
    Exit-Failure "pg_dump failed with exit code $LASTEXITCODE. Is pg_dump in PATH? Is PostgreSQL running?"
}

$DbSize = (Get-Item $DbDumpFile).Length
Write-Log "Database dump complete: $DbDumpFile ($([math]::Round($DbSize / 1KB, 1)) KB)"

# ── Step 2: Uploads folder backup ────────────────────────────────────────────

Write-Log "Starting uploads folder backup..."

$ResolvedUploads = Resolve-Path $UploadsDir -ErrorAction SilentlyContinue
if (-not $ResolvedUploads) {
    Write-Log "Uploads directory not found: $UploadsDir" "WARNING"
    Write-Log "Skipping uploads backup. If the application has stored files, this backup is INCOMPLETE." "WARNING"
} else {
    Compress-Archive -Path "$ResolvedUploads\*" -DestinationPath $UploadsZip -Force
    if ($LASTEXITCODE -ne 0 -and -not (Test-Path $UploadsZip)) {
        Exit-Failure "Failed to compress uploads folder."
    }
    $ZipSize = (Get-Item $UploadsZip).Length
    Write-Log "Uploads backup complete: $UploadsZip ($([math]::Round($ZipSize / 1MB, 2)) MB)"
}

# ── Step 3: Verify backup files ───────────────────────────────────────────────

Write-Log "Verifying backup files..."

if (-not (Test-Path $DbDumpFile) -or (Get-Item $DbDumpFile).Length -lt 100) {
    Exit-Failure "Database dump file is missing or suspiciously small. Backup may be corrupt."
}

Write-Log "Verification passed."
Write-Log "Backup complete."
Write-Log "------------------------------------------------------------"
Write-Log "Database : $DbDumpFile"
if (Test-Path $UploadsZip) {
    Write-Log "Uploads  : $UploadsZip"
}
Write-Log "Log      : $LogFile"
Write-Log "------------------------------------------------------------"
Write-Log "IMPORTANT: Store this backup folder in a secure location."
Write-Log "A database backup without the uploads folder is INCOMPLETE."

# ── Restore instructions ──────────────────────────────────────────────────────
#
# To restore the database:
#   1. Create a clean database:
#        createdb -h localhost -U postgres auditflow_ims_restore
#   2. Restore the dump:
#        psql -h localhost -U postgres -d auditflow_ims_restore -f "C:\AuditFlowBackups\<timestamp>\auditflow_db.sql"
#   3. Update DATABASE_URL in your .env to point to the restored database.
#
# To restore uploaded files:
#   1. Extract auditflow_uploads.zip to the uploads folder:
#        Expand-Archive -Path "C:\AuditFlowBackups\<timestamp>\auditflow_uploads.zip" -DestinationPath "..\uploads" -Force
#
# Run both restore steps. A partial restore will break file references.
