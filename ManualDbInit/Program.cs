using Npgsql;
using System;

var connString = "Host=dpg-d8in7vh4tr8s73oh4s10-a.oregon-postgres.render.com;Database=videodb_r4pr;Username=videodb_r4pr_user;Password=RtgrSI7qs78AOa0xszztfLI2tZOThw9c;Port=5432;SSL Mode=Require;Trust Server Certificate=true;Pooling=false;Timeout=30";

Console.WriteLine("Diagnostic Start...");
Console.WriteLine("Target: " + "dpg-d8in7vh4tr8s73oh4s10-a.oregon-postgres.render.com");

try
{
    using var conn = new NpgsqlConnection(connString);
    conn.Open();
    Console.WriteLine("CONNECTED!");

    using var cmd = new NpgsqlCommand("CREATE TABLE IF NOT EXISTS chat_messages (id UUID PRIMARY KEY, room_id TEXT, sender_id TEXT, content TEXT, created_at TIMESTAMPTZ);", conn);
    cmd.ExecuteNonQuery();
    Console.WriteLine("Table 'chat_messages' ensured.");
}
catch (Exception ex)
{
    Console.WriteLine("EXCEPTION: " + ex.GetType().Name);
    Console.WriteLine("MESSAGE: " + ex.Message);
    if (ex.InnerException != null) Console.WriteLine("INNER: " + ex.InnerException.Message);
    Console.WriteLine("STACK: " + ex.StackTrace);
}
