using Npgsql;
using System;
using System.Threading;

var connString = "Host=dpg-d8in7vh4tr8s73oh4s10-a.oregon-postgres.render.com;Database=videodb_r4pr;Username=videodb_r4pr_user;Password=RtgrSI7qs78AOa0xszztfLI2tZOThw9c;Port=5432;SSL Mode=Require;Trust Server Certificate=true;Pooling=false;Timeout=60";

string createTableSql = @"
CREATE TABLE IF NOT EXISTS ""ChatMessages"" (
    ""Id"" UUID PRIMARY KEY,
    ""RoomId"" TEXT NOT NULL,
    ""SenderConnectionId"" TEXT NOT NULL,
    ""Content"" TEXT NOT NULL,
    ""Timestamp"" TIMESTAMP WITH TIME ZONE NOT NULL
);";

Console.WriteLine("--- Database Initialization Tool ---");
Console.WriteLine("Host: dpg-d8in7vh4tr8s73oh4s10-a.oregon-postgres.render.com");

for (int i = 1; i <= 3; i++)
{
    try
    {
        Console.WriteLine($"Attempt {i}: Connecting...");
        using var conn = new NpgsqlConnection(connString);
        conn.Open();
        Console.WriteLine("SUCCESS: Connected.");

        using var cmd = new NpgsqlCommand(createTableSql, conn);
        cmd.ExecuteNonQuery();
        Console.WriteLine("SUCCESS: 'ChatMessages' table ensured.");
        
        // List tables
        using var listCmd = new NpgsqlCommand("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';", conn);
        using var reader = listCmd.ExecuteReader();
        Console.WriteLine("Existing Tables:");
        while (reader.Read()) Console.WriteLine("- " + reader.GetString(0));
        
        return; // Success
    }
    catch (Exception ex)
    {
        Console.WriteLine($"FAIL: {ex.Message}");
        if (ex.InnerException != null) Console.WriteLine($"Inner: {ex.InnerException.Message}");
        if (i < 3)
        {
            Console.WriteLine("Retrying in 2 seconds...");
            Thread.Sleep(2000);
        }
    }
}
Console.WriteLine("All attempts failed.");
