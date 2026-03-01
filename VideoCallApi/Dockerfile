FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["VideoCallApi.csproj", "./"]
RUN dotnet restore "VideoCallApi.csproj"
COPY . .
WORKDIR "/src/"
RUN dotnet build "VideoCallApi.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "VideoCallApi.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "VideoCallApi.dll"]
