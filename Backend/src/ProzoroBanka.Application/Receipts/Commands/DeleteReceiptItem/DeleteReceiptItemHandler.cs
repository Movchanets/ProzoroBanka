using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.Common;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.DeleteReceiptItem;

public class DeleteReceiptItemHandler : IRequestHandler<DeleteReceiptItemCommand, ServiceResponse<ReceiptPipelineDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IFileStorage _fileStorage;

	public DeleteReceiptItemHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth, IFileStorage fileStorage)
	{
		_db = db;
		_orgAuth = orgAuth;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(DeleteReceiptItemCommand request, CancellationToken ct)
	{
		var receipt = await _db.FindAccessibleWithPipelineGraphAsync(_orgAuth, request.ReceiptId, request.CallerDomainUserId, ct);

		if (receipt is null)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");

		var item = receipt.Items.FirstOrDefault(candidate => candidate.Id == request.ReceiptItemId && !candidate.IsDeleted);
		if (item is null)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Позицію товару не знайдено");

		item.IsDeleted = true;

		foreach (var photo in receipt.ItemPhotos.Where(photo => !photo.IsDeleted && photo.CampaignItemId == item.Id))
			photo.CampaignItemId = null;

		await _db.SaveChangesAsync(ct);

		return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, receipt));
	}
}
