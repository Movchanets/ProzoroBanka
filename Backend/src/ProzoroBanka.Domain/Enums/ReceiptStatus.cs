namespace ProzoroBanka.Domain.Enums;

public enum ReceiptStatus
{
    PendingOcr = 0,
    PendingStateValidation = 1,
    OcrExtracted = 2,
    FailedVerification = 3,
    ValidationDeferredRateLimit = 4,
    Draft = 5,
    StateVerified = 6,
    InvalidData = 7,
    OcrDeferredMonthlyQuota = 8,

    Uploaded = PendingOcr,
    Parsing = PendingStateValidation,
    Parsed = OcrExtracted,
    ParseFailed = FailedVerification,
    Matched = ValidationDeferredRateLimit,
    Verified = StateVerified
}
