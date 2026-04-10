using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Receipts.Commands.DeleteReceipt;

public class DeleteReceiptHandler : IRequestHandler<DeleteReceiptCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public DeleteReceiptHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse> Handle(DeleteReceiptCommand request, CancellationToken ct)
	{
		var receipt = await _db.Receipts.FindAsync([request.ReceiptId], ct);
		if (receipt is null || receipt.IsDeleted)
			return ServiceResponse.Failure("Чек не знайдено");

		var isOwner = receipt.UserId == request.CallerDomainUserId;
		if (!isOwner)
		{
			if (!receipt.OrganizationId.HasValue)
				return ServiceResponse.Failure("Чек не знайдено");

			var isOrgMember = await _orgAuth.IsMember(receipt.OrganizationId.Value, request.CallerDomainUserId, ct);
			if (!isOrgMember)
				return ServiceResponse.Failure("Чек не знайдено");
		}

		receipt.IsDeleted = true;
		await _db.SaveChangesAsync(ct);

		return ServiceResponse.Success("Чек видалено");
	}
}
