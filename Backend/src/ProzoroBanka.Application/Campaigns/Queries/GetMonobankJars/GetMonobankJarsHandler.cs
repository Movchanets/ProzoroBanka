using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Queries.GetMonobankJars;

public class GetMonobankJarsHandler : IRequestHandler<GetMonobankJarsQuery, ServiceResponse<MonobankClientInfoDto>>
{
	private readonly IMonobankStatelessProxyService _monobank;

	public GetMonobankJarsHandler(IMonobankStatelessProxyService monobank)
	{
		_monobank = monobank;
	}

	public async Task<ServiceResponse<MonobankClientInfoDto>> Handle(
		GetMonobankJarsQuery request, CancellationToken cancellationToken)
	{
		return await _monobank.GetClientInfoAsync(request.Token, cancellationToken);
	}
}
