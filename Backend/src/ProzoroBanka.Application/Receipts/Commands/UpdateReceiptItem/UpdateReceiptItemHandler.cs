using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.Common;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.UpdateReceiptItem;

public class UpdateReceiptItemHandler : IRequestHandler<UpdateReceiptItemCommand, ServiceResponse<ReceiptPipelineDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public UpdateReceiptItemHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(UpdateReceiptItemCommand request, CancellationToken ct)
	{
		var receipt = await _db.FindOwnedWithPipelineGraphAsync(request.ReceiptId, request.CallerDomainUserId, ct);

		if (receipt is null)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");

		var item = receipt.Items.FirstOrDefault(candidate => candidate.Id == request.ReceiptItemId && !candidate.IsDeleted);
		if (item is null)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Позицію товару не знайдено");

		item.Name = request.Name.Trim();
		item.Quantity = request.Quantity;
		item.UnitPrice = request.UnitPrice;
		item.TotalPrice = request.TotalPrice;
		item.Barcode = string.IsNullOrWhiteSpace(request.Barcode) ? null : request.Barcode.Trim();
		item.VatRate = request.VatRate;
		item.VatAmount = request.VatAmount;

		await _db.SaveChangesAsync(ct);

		return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, receipt));
	}
}