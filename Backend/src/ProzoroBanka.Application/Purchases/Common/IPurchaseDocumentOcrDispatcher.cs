using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Entities;

namespace ProzoroBanka.Application.Purchases.Common;

public interface IPurchaseDocumentOcrDispatcher
{
	Task ApplyAsync(CampaignDocument document, DocumentOcrResult ocrResult, CancellationToken ct);
}