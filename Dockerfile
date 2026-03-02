FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["VideoCallApi/VideoCallApi.csproj", "VideoCallApi/"]
RUN dotnet restore "VideoCallApi/VideoCallApi.csproj"
COPY VideoCallApi/ VideoCallApi/
WORKDIR "/src/VideoCallApi"
RUN dotnet build "VideoCallApi.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "VideoCallApi.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
COPY --from=publish /app/publish .

# Use the PORT environment variable provided by Render or default to 8080
ENV PORT=8080
EXPOSE ${PORT}
ENTRYPOINT ["sh", "-c", "dotnet VideoCallApi.dll --urls http://0.0.0.0:${PORT}"]
