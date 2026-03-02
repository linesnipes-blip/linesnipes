const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { supabase } = require("./utils/db");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  const sig = event.headers["stripe-signature"];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook sig verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object;
        const userId = session.metadata?.user_id || session.client_reference_id;
        const plan = session.metadata?.plan;

        if (userId && plan) {
          const updateData = {
            plan,
            stripe_customer_id: session.customer,
            fetches_used: 0, // Reset on new plan
            plan_started_at: new Date().toISOString(),
          };

          if (plan !== "lifetime") {
            updateData.stripe_subscription_id = session.subscription;
          }

          await supabase.from("profiles").update(updateData).eq("id", userId);
          console.log(`Updated user ${userId} to plan: ${plan}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = stripeEvent.data.object;
        if (sub.cancel_at_period_end) {
          // User cancelled but still has access until period ends
          console.log(`Subscription ${sub.id} will cancel at period end`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        // Subscription actually ended — downgrade to free
        const sub = stripeEvent.data.object;
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_subscription_id", sub.id);

        if (profiles?.length) {
          await supabase
            .from("profiles")
            .update({ plan: "free", fetches_used: 0, stripe_subscription_id: null })
            .eq("id", profiles[0].id);
          console.log(`Downgraded user ${profiles[0].id} to free`);
        }
        break;
      }

      case "invoice.paid": {
        // Monthly renewal — reset usage counter
        const invoice = stripeEvent.data.object;
        const subId = invoice.subscription;
        if (subId) {
          await supabase
            .from("profiles")
            .update({ fetches_used: 0 })
            .eq("stripe_subscription_id", subId);
          console.log(`Reset usage for subscription ${subId}`);
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return { statusCode: 500, body: "Internal error" };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
