import backend/db
import backend/router
import gleam/erlang/process
import gleam/io
import mist
import wisp
import wisp/wisp_mist

pub fn main() {
  wisp.configure_logger()
  io.println("Starting Project Management API server on http://localhost:3000")

  let assert Ok(conn) = db.connect()

  let secret_key_base = wisp.random_string(64)

  let assert Ok(_) =
    wisp_mist.handler(
      fn(req) { router.handle_request(req, conn) },
      secret_key_base,
    )
    |> mist.new
    |> mist.port(3000)
    |> mist.start
  process.sleep_forever()
}
