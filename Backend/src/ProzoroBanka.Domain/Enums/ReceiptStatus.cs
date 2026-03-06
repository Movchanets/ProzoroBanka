namespace ProzoroBanka.Domain.Enums;

public enum ReceiptStatus
{
    Uploaded = 0,
    Parsing = 1,
    Parsed = 2,
    ParseFailed = 3,
    Matched = 4,
    Draft = 5,
    Verified = 6
}
