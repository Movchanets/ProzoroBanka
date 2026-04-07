using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.OcrModels.DTOs;

namespace ProzoroBanka.Application.Admin.Queries.GetOcrModels;

public record GetOcrModelsQuery() : IRequest<ServiceResponse<List<OcrModelConfigDto>>>;

public class GetOcrModelsHandler : IRequestHandler<GetOcrModelsQuery, ServiceResponse<List<OcrModelConfigDto>>>
{
	private readonly IApplicationDbContext _db;

	public GetOcrModelsHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse<List<OcrModelConfigDto>>> Handle(GetOcrModelsQuery request, CancellationToken ct)
	{
		var models = await _db.OcrModelConfigs
			.OrderByDescending(m => m.IsDefault)
			.ThenBy(m => m.Name)
			.Select(m => new OcrModelConfigDto(m.Id, m.Name, m.ModelIdentifier, m.Provider, m.IsActive, m.IsDefault))
			.ToListAsync(ct);

		return ServiceResponse<List<OcrModelConfigDto>>.Success(models);
	}
}
