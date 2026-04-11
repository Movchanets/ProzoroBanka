using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.Common;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Receipts.Commands.ActivateReceipt;

public class ActivateReceiptHandler : IRequestHandler<ActivateReceiptCommand, ServiceResponse<ReceiptPipelineDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public ActivateReceiptHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(ActivateReceiptCommand request, CancellationToken ct)
	{
		var receipt = await _db.FindOwnedWithPipelineGraphAsync(request.ReceiptId, request.CallerDomainUserId, ct);
		if (receipt is null)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");

		if (receipt.Status != ReceiptStatus.StateVerified)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Активувати можна тільки чек зі статусом StateVerified");

		receipt.PublicationStatus = ReceiptPublicationStatus.Active;
		await _db.SaveChangesAsync(ct);

		return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, receipt));
	}
}
