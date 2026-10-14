import random
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import (
    User,
    Site,
    Device,
    ServiceEvent,
    TelemetryReading,
)
from app.core.security import get_password_hash

# Fixed seed for 100% deterministic reproducibility
RANDOM_SEED = 42

REFERENCE_DATE = date(2026, 10, 14)
REFERENCE_DATETIME = datetime(2026, 10, 14, 12, 0, 0, tzinfo=timezone.utc)

CITIES_AND_REGIONS = [
    ("New York", "North", "NYC"),
    ("Boston", "North", "BOS"),
    ("Chicago", "Central", "CHI"),
    ("Dallas", "South", "DFW"),
    ("Austin", "South", "AUS"),
    ("San Francisco", "West", "SFO"),
    ("Seattle", "West", "SEA"),
    ("Denver", "West", "DEN"),
    ("Atlanta", "South", "ATL"),
    ("Miami", "South", "MIA"),
    ("Philadelphia", "East", "PHL"),
    ("Washington", "East", "DCA"),
    ("Phoenix", "West", "PHX"),
    ("Detroit", "Central", "DET"),
    ("Minneapolis", "Central", "MSP"),
    ("Toronto", "North", "YYZ"),
    ("London", "East", "LON"),
    ("Frankfurt", "Central", "FRA"),
    ("Tokyo", "East", "TYO"),
    ("Singapore", "South", "SIN"),
]

VENDORS_AND_MODELS = [
    ("NetEdge Systems", ["EdgeRouter-X4", "EdgeCore-9000", "EdgeSwitch-48P"]),
    ("OmniNet", ["OmniSwitch-500", "OmniRoute-200", "OmniGuard-FW"]),
    ("PacketFlow", ["PF-Access-100", "PF-Gateway-Pro", "PF-Firewall-5000"]),
    ("SkyLink Networks", ["SkyBridge-300", "SkySwitch-24G", "SkyCore-800"]),
]


def seed_database(db: Session | None = None) -> dict:
    """Deterministic database seed function."""
    random.seed(RANDOM_SEED)
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        print("[*] Checking existing data...")
        # Check if already seeded
        existing_devices = db.query(Device).count()
        if existing_devices >= 5000:
            print(f"[*] Database already contains {existing_devices} devices. Truncating for fresh deterministic seed...")
            # Truncate tables to ensure deterministic fresh state
            db.query(TelemetryReading).delete()
            db.query(ServiceEvent).delete()
            db.query(Device).delete()
            db.query(Site).delete()
            db.commit()

        print("[*] Seeding demo users...")
        # Upsert demo users
        demo_users = [
            ("admin@querytrust.local", "System Administrator", "AdminPass123!", "admin"),
            ("analyst@querytrust.local", "Lead Data Analyst", "AnalystPass123!", "analyst"),
            ("viewer@querytrust.local", "Executive Viewer", "ViewerPass123!", "viewer"),
        ]
        for email, name, pwd, role in demo_users:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    email=email,
                    display_name=name,
                    password_hash=get_password_hash(pwd),
                    role=role,
                    is_active=True,
                )
                db.add(user)
        db.commit()

        print("[*] Seeding 50 sites...")
        sites = []
        site_id_counter = 1
        for i in range(50):
            city_info = CITIES_AND_REGIONS[i % len(CITIES_AND_REGIONS)]
            city, region, prefix = city_info
            site_num = (i // len(CITIES_AND_REGIONS)) + 1
            code = f"{prefix}-{site_num:02d}"
            site = Site(
                id=site_id_counter,
                site_code=code,
                site_name=f"{city} Datacenter {site_num}",
                city=city,
                region=region,
            )
            sites.append(site)
            site_id_counter += 1
        db.add_all(sites)
        db.commit()

        print("[*] Seeding 5,000 devices with controlled data quality variations...")
        devices = []
        statuses = ["active", "active", "active", "ACTIVE", "Active", "inactive", "maintenance", "decommissioned"]
        device_types = ["Switch", "Switch", "Router", "Firewall", "Access Point", "Gateway"]

        # Duplicate serial numbers for testing duplicate detection
        duplicate_serials = [f"SN-DUP-TEST-{i:03d}" for i in range(10)]

        for i in range(1, 5001):
            vendor, models = random.choice(VENDORS_AND_MODELS)
            model = random.choice(models)
            site_id = random.randint(1, 50)
            
            # Casing/whitespace inconsistency for ~4% of rows
            raw_type = random.choice(device_types)
            if i % 40 == 0:
                raw_type = raw_type.lower()
            elif i % 50 == 0:
                raw_type = f" {raw_type} "

            # Status with intentional variations
            if i % 100 == 0:
                status = "decommissioned_pending_audit"
            elif i % 150 == 0:
                status = "staged"
            else:
                status = random.choice(statuses)

            install_days_ago = random.randint(60, 1800)
            installed_at = REFERENCE_DATE - timedelta(days=install_days_ago)

            # Warranty dates:
            # - 8% null (missing warranty)
            # - 1% warranty before installation date (invalid date relationship)
            # - 6% expiring in next 30 days [2026-10-14, 2026-11-13]
            # - rest expiring in 2027-2029
            if i % 12 == 0:
                warranty_expiry = None
            elif i % 100 == 7:
                # Invalid: warranty expiry before install date
                warranty_expiry = installed_at - timedelta(days=random.randint(10, 120))
            elif i % 16 == 0:
                # Expiring in next 30 days
                warranty_expiry = REFERENCE_DATE + timedelta(days=random.randint(1, 29))
            else:
                warranty_expiry = REFERENCE_DATE + timedelta(days=random.randint(35, 1100))

            # Serial number with controlled duplicates
            if i <= 20:
                serial_number = duplicate_serials[i % 10]
            elif i % 33 == 0:
                serial_number = None  # Missing serial
            else:
                serial_number = f"SN-{vendor[:3].upper()}-{i:05d}"

            device = Device(
                id=i,
                asset_tag=f"ASSET-{i:05d}",
                device_type=raw_type,
                vendor=vendor,
                model=model,
                firmware_version=f"v{random.randint(1,4)}.{random.randint(0,9)}.{random.randint(0,9)}",
                site_id=site_id,
                status=status,
                installed_at=installed_at,
                warranty_expiry=warranty_expiry,
                serial_number=serial_number,
                created_at=REFERENCE_DATETIME - timedelta(days=install_days_ago),
            )
            devices.append(device)

            if len(devices) >= 1000:
                db.add_all(devices)
                db.commit()
                devices = []

        if devices:
            db.add_all(devices)
            db.commit()

        print("[*] Seeding 6,000 service events...")
        event_types = [
            "Firmware Upgrade", "Interface Flapping", "Power Supply Alert",
            "Configuration Drift", "Overheating Warning", "Hardware Fault",
            "Port Security Violation", "BGP Flap"
        ]
        severities = ["critical", "high", "medium", "low"]
        event_statuses = ["open", "in_progress", "resolved", "closed", "cancelled"]

        events = []
        for i in range(1, 6001):
            device_id = random.randint(1, 5000)
            event_type = random.choice(event_types)
            severity = random.choice(severities)
            # 25% open/in_progress, 75% resolved/closed
            if i % 4 == 0:
                status = random.choice(["open", "in_progress"])
                opened_ago = random.randint(1, 20)
                opened_at = REFERENCE_DATETIME - timedelta(days=opened_ago, hours=random.randint(1, 23))
                closed_at = None
            else:
                status = random.choice(["resolved", "closed"])
                opened_ago = random.randint(10, 300)
                opened_at = REFERENCE_DATETIME - timedelta(days=opened_ago, hours=random.randint(1, 23))
                duration_hours = random.randint(1, 72)
                closed_at = opened_at + timedelta(hours=duration_hours)

            event = ServiceEvent(
                id=i,
                device_id=device_id,
                event_type=event_type,
                severity=severity,
                status=status,
                opened_at=opened_at,
                closed_at=closed_at,
                description=f"Synthetic incident report for {event_type} on device {device_id}. Status: {status}.",
            )
            events.append(event)

            if len(events) >= 1000:
                db.add_all(events)
                db.commit()
                events = []

        if events:
            db.add_all(events)
            db.commit()

        print("[*] Seeding 25,000 telemetry readings with synthetic outliers...")
        readings = []
        reading_id = 1
        # Sample across active devices
        sampled_devices = list(range(1, 2001))

        for dev_id in sampled_devices:
            # 12-13 readings per sampled device
            num_points = 12 if dev_id % 2 == 0 else 13
            for step in range(num_points):
                rec_time = REFERENCE_DATETIME - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23), minutes=random.randint(0, 59))
                
                # Check if this reading should be an injected outlier (~1.2% rate)
                is_outlier = (reading_id % 80 == 0)

                if is_outlier:
                    # Injected anomaly: extreme CPU, memory, or packet loss
                    cpu = round(random.uniform(92.0, 99.8), 2)
                    mem = round(random.uniform(90.0, 99.5), 2)
                    temp = round(random.uniform(82.0, 98.0), 2)
                    pkt_loss = round(random.uniform(15.0, 45.0), 2)
                    lat = round(random.uniform(250.0, 750.0), 2)
                else:
                    # Normal behavior
                    cpu = round(random.uniform(12.0, 68.0), 2)
                    mem = round(random.uniform(25.0, 72.0), 2)
                    temp = round(random.uniform(34.0, 58.0), 2)
                    pkt_loss = round(random.uniform(0.0, 1.2), 2)
                    lat = round(random.uniform(3.0, 38.0), 2)

                reading = TelemetryReading(
                    id=reading_id,
                    device_id=dev_id,
                    recorded_at=rec_time,
                    cpu_percent=cpu,
                    memory_percent=mem,
                    temperature_c=temp,
                    packet_loss_percent=pkt_loss,
                    latency_ms=lat,
                    known_injected_outlier=is_outlier,
                )
                readings.append(reading)
                reading_id += 1

                if len(readings) >= 2000:
                    db.add_all(readings)
                    db.commit()
                    readings = []

        if readings:
            db.add_all(readings)
            db.commit()

        # Update sequences for postgres auto-increment
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT setval('sites_id_seq', (SELECT COALESCE(MAX(id), 1) FROM sites));"))
            conn.execute(text("SELECT setval('devices_id_seq', (SELECT COALESCE(MAX(id), 1) FROM devices));"))
            conn.execute(text("SELECT setval('service_events_id_seq', (SELECT COALESCE(MAX(id), 1) FROM service_events));"))
            conn.execute(text("SELECT setval('telemetry_readings_id_seq', (SELECT COALESCE(MAX(id), 1) FROM telemetry_readings));"))
            conn.commit()

        counts = {
            "users": db.query(User).count(),
            "sites": db.query(Site).count(),
            "devices": db.query(Device).count(),
            "service_events": db.query(ServiceEvent).count(),
            "telemetry_readings": db.query(TelemetryReading).count(),
        }
        print(f"[OK] Seeding complete! Database counts: {counts}")
        return counts

    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    seed_database()
