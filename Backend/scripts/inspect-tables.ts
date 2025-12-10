import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTables() {
  try {
    console.log("Inspecting Supabase tables...\n");

    // Check payments table
    const paymentsTable = process.env.SUPABASE_TABLE_PAYMENTS || "payments";
    console.log(`\n📊 Table: ${paymentsTable}`);
    const { data: paymentsData, error: paymentsError } = await supabase
      .from(paymentsTable)
      .select("*")
      .limit(1);

    if (paymentsError) {
      console.error(`Error accessing ${paymentsTable}:`, paymentsError.message);
    } else {
      console.log(`✅ Table exists`);
      if (paymentsData && paymentsData.length > 0) {
        console.log(
          "Sample row structure:",
          JSON.stringify(paymentsData[0], null, 2)
        );
      } else {
        console.log("Table is empty (no rows yet)");
        // Try to get column info by attempting a select with specific columns
        const { data: testData } = await supabase
          .from(paymentsTable)
          .select("id, upi_id, amount, status")
          .limit(0);
        console.log(
          "Expected columns: id, upi_id, amount, status, and more..."
        );
      }
    }

    // Check payment_logs table
    const logsTable = process.env.SUPABASE_TABLE_PAYMENT_LOGS || "payment_logs";
    console.log(`\n📊 Table: ${logsTable}`);
    const { data: logsData, error: logsError } = await supabase
      .from(logsTable)
      .select("*")
      .limit(1);

    if (logsError) {
      console.error(`Error accessing ${logsTable}:`, logsError.message);
    } else {
      console.log(`✅ Table exists`);
      if (logsData && logsData.length > 0) {
        console.log(
          "Sample row structure:",
          JSON.stringify(logsData[0], null, 2)
        );
      } else {
        console.log("Table is empty (no rows yet)");
      }
    }

    // Try to get table count
    console.log(`\n📈 Table Statistics:`);
    const { count: paymentsCount } = await supabase
      .from(paymentsTable)
      .select("*", { count: "exact", head: true });
    console.log(`${paymentsTable}: ${paymentsCount ?? 0} rows`);

    const { count: logsCount } = await supabase
      .from(logsTable)
      .select("*", { count: "exact", head: true });
    console.log(`${logsTable}: ${logsCount ?? 0} rows`);
  } catch (error: any) {
    console.error("Error inspecting tables:", error.message);
    process.exit(1);
  }
}

inspectTables();
