using AutoMapper;
using ProzoroBanka.Application.Auth.DTOs;
using ProzoroBanka.Domain.Entities;

namespace ProzoroBanka.Application.Common.Mappings;

public class MappingProfile : Profile
{
	public MappingProfile()
	{
		CreateMap<User, UserInfoDto>()
			.ForMember(dest => dest.ProfilePhotoUrl, opt => opt.Ignore()); // Resolved via IFileStorage.GetPublicUrl()
	}
}
