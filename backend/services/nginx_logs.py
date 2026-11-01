
def get_nginx_stats(log_path):
    stats = {
        "total_requests": 0,
        "successful_requests": 0,
        "client_errors": 0,
        "server_errors": 0,
        "gateway_errors": 0,
        "rate_limit_violations": 0,
        "status_codes": {}
    }

    try:
        with open(log_path, "r", encoding="utf-8") as log_file:
            for line in log_file:
                parts = line.strip().split("|")

                if len(parts) < 5:
                    continue

                status_part = parts[4].strip()

                if not status_part.startswith("STATUS="):
                    continue

                try:
                    status = int(status_part.split("=", 1)[1])
                except ValueError:
                    continue

                stats["total_requests"] += 1

                status_key = str(status)
                stats["status_codes"][status_key] = (
                    stats["status_codes"].get(status_key, 0) + 1
                )

                if 200 <= status < 400:
                    stats["successful_requests"] += 1

                elif 400 <= status < 500:
                    stats["client_errors"] += 1

                elif 500 <= status < 600:
                    stats["server_errors"] += 1

                if status in (502, 503, 504):
                    stats["gateway_errors"] += 1

                if status == 429:
                    stats["rate_limit_violations"] += 1

    except FileNotFoundError:
        stats["error"] = "NGINX access log file not found"

    except PermissionError:
        stats["error"] = "Permission denied while reading NGINX access log"

    return stats
