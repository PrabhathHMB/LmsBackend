import {
  PrismaClient,
  Role,
  CourseLevel,
  CourseStatus,
  EnrollmentStatus,
  AttendanceStatus,
  SubmissionStatus,
  ResultType,
  TargetRole,
  FeePaymentStatus,
  PaymentMethod,
  SessionType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting LMS Database Seeding (Source of Truth: Sri Lankan Curriculum)...');

  // 1. Official Sri Lankan Categories (Grade 6–11 Mathematics & A/L SFT)
  const categoriesData = [
    {
      name: 'Grade 6 Mathematics (6 ශ්‍රේණිය)',
      slug: 'grade-6-maths',
      description: 'Numbers, decimals, basic geometry, fractions, perimeter, and mathematical foundations for Grade 6 Sri Lankan syllabus.',
      icon: 'Calculator',
      defaultMonthlyFee: 2000.0,
    },
    {
      name: 'Grade 7 Mathematics (7 ශ්‍රේණිය)',
      slug: 'grade-7-maths',
      description: 'Integers, algebraic expressions, angles, ratios, percentages, and area for Grade 7 syllabus.',
      icon: 'Compass',
      defaultMonthlyFee: 2000.0,
    },
    {
      name: 'Grade 8 Mathematics (8 ශ්‍රේණිය)',
      slug: 'grade-8-maths',
      description: 'Linear equations, indices, circles, volume, Cartesian plane, and statistics for Grade 8 syllabus.',
      icon: 'Percent',
      defaultMonthlyFee: 2000.0,
    },
    {
      name: 'Grade 9 Mathematics (9 ශ්‍රේණිය)',
      slug: 'grade-9-maths',
      description: 'Factorization, algebraic fractions, Pythagoras theorem, sets, probability, and geometric constructions for Grade 9.',
      icon: 'Layers',
      defaultMonthlyFee: 2000.0,
    },
    {
      name: 'Grade 10 Mathematics — O/L (10 ශ්‍රේණිය)',
      slug: 'grade-10-maths',
      description: 'Quadratic expressions, logarithmic functions, perimeter of sectors, volume of cylinders, graphs, and O/L Part I & II foundations.',
      icon: 'GraduationCap',
      defaultMonthlyFee: 2500.0,
    },
    {
      name: 'Grade 11 Mathematics — O/L Revision (11 ශ්‍රේණිය)',
      slug: 'grade-11-maths',
      description: 'G.C.E. O/L exam mastery: Trigonometry, quadratic equations, circle theorems, statistics, probability, and past paper discussions.',
      icon: 'Trophy',
      defaultMonthlyFee: 2500.0,
    },
    {
      name: 'A/L Science for Technology — SFT (තාක්ෂණවේදය සඳහා විද්‍යාව)',
      slug: 'al-sft',
      description: 'Comprehensive G.C.E. A/L Science for Technology: Electronics, Mechanics, Energy, Materials, Agro-technology, Food Science & Past Papers.',
      icon: 'Cpu',
      defaultMonthlyFee: 3500.0,
    },
    {
      name: 'Full-Stack Web Development',
      slug: 'web-development',
      description: 'Master front-end, back-end, and full-stack engineering technologies.',
      icon: 'BookOpen',
      defaultMonthlyFee: 4000.0,
    },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categoriesData) {
    const c = await prisma.courseCategory.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        defaultMonthlyFee: cat.defaultMonthlyFee,
      },
      create: cat,
    });
    categoryMap[cat.slug] = c.id;
  }
  console.log('✔ Sri Lankan Academic Categories created with monthly fees');

  // 2. Passwords
  const adminPass = await bcrypt.hash('Admin123!', 10);
  const teacherPass = await bcrypt.hash('Teacher123!', 10);
  const studentPass = await bcrypt.hash('Student123!', 10);

  // 3. Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lms.local' },
    update: {},
    create: {
      email: 'admin@lms.local',
      passwordHash: adminPass,
      firstName: 'Naveen',
      lastName: 'Lakmal (B.Sc. Eng)',
      role: Role.ADMIN,
      phone: '+94 77 123 4567',
    },
  });
  console.log('✔ Admin user created: admin@lms.local');

  // 4. Teacher User & Profile
  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@lms.local' },
    update: {},
    create: {
      email: 'teacher@lms.local',
      passwordHash: teacherPass,
      firstName: 'Kavinda',
      lastName: 'Perera',
      role: Role.TEACHER,
      phone: '+94 71 987 6543',
      teacherProfile: {
        create: {
          employeeId: 'TCH-1001',
          qualification: 'B.Sc. (Hons) Engineering, University of Moratuwa',
          specialization: 'Secondary Mathematics & Science for Technology',
          bio: 'Senior educator with over 10 years of tuition excellence coaching island top rankers in O/L Mathematics and A/L SFT.',
          headline: 'Senior Mathematics & SFT Lecturer | 10+ Years Tuition Excellence',
        },
      },
    },
    include: { teacherProfile: true },
  });
  console.log('✔ Teacher created: teacher@lms.local');

  // 5. Students with Sri Lankan Contact Details and Grade Allocation
  const student1 = await prisma.user.upsert({
    where: { email: 'student@lms.local' },
    update: {},
    create: {
      email: 'student@lms.local',
      passwordHash: studentPass,
      firstName: 'Alex',
      lastName: 'Fernando',
      role: Role.STUDENT,
      phone: '+94 76 111 2233',
      studentProfile: {
        create: {
          studentIdNumber: 'STU-2001',
          gradeLevel: 'Grade 11',
          studentPhone: '+94 76 111 2233',
          parentPhone: '+94 77 444 5566',
          address: 'No 45, Temple Road, Colombo 03, Sri Lanka',
          assignedGradeId: categoryMap['grade-11-maths'],
        },
      },
    },
    include: { studentProfile: true },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@lms.local' },
    update: {},
    create: {
      email: 'student2@lms.local',
      passwordHash: studentPass,
      firstName: 'Nethmi',
      lastName: 'Silva',
      role: Role.STUDENT,
      phone: '+94 72 333 4455',
      studentProfile: {
        create: {
          studentIdNumber: 'STU-2002',
          gradeLevel: 'Grade 11',
          studentPhone: '+94 72 333 4455',
          parentPhone: '+94 71 888 9900',
          address: 'No 12/A, Galle Road, Panadura, Sri Lanka',
          assignedGradeId: categoryMap['grade-11-maths'],
        },
      },
    },
    include: { studentProfile: true },
  });
  console.log('✔ Students created with Grade Allocation and Parent Contact info');

  const teacherId = teacherUser.teacherProfile!.id;
  const studentProfileId = student1.studentProfile!.id;

  // 6. Courses: Grade 11 Mathematics & A/L SFT
  const course1 = await prisma.course.upsert({
    where: { slug: 'grade-11-ol-mathematics-mastery' },
    update: {
      categoryId: categoryMap['grade-11-maths'],
    },
    create: {
      title: 'Grade 11 O/L Mathematics Complete Masterclass',
      slug: 'grade-11-ol-mathematics-mastery',
      shortDescription: 'Master the entire O/L Mathematics syllabus with theory, theorems, and past paper analysis.',
      description: 'Comprehensive study program tailored for students sitting for the G.C.E. Ordinary Level examinations. Covers quadratic equations, trigonometry, progressions, circle theorems, and probability.',
      price: 2500.0,
      currency: 'LKR',
      level: CourseLevel.INTERMEDIATE,
      status: CourseStatus.PUBLISHED,
      thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80',
      categoryId: categoryMap['grade-11-maths'],
      teacherId,
      modules: {
        create: [
          {
            title: 'Module 1: Quadratic Equations & Functions (වර්ගජ සමීකරණ)',
            orderIndex: 0,
            lessons: {
              create: [
                {
                  title: '1.1 Solving Quadratic Equations by Factoring',
                  content: 'Comprehensive lesson on finding roots of quadratic equations through factor decomposition.',
                  videoUrl: 'https://www.youtube.com/watch?v=zqL_Vv7_7gM',
                  durationMinutes: 45,
                  orderIndex: 0,
                  isFreePreview: true,
                },
                {
                  title: '1.2 Quadratic Formula & Completing the Square',
                  content: 'Step-by-step derivation and application of the quadratic formula.',
                  videoUrl: 'https://www.youtube.com/watch?v=EeVrL1xM1wM',
                  durationMinutes: 50,
                  orderIndex: 1,
                  isFreePreview: false,
                },
              ],
            },
          },
          {
            title: 'Module 2: Circle Theorems & Geometric Proofs (වෘත්ත ප්‍රමේයයන්)',
            orderIndex: 1,
            lessons: {
              create: [
                {
                  title: '2.1 Angles in the Same Segment & Central Angles',
                  content: 'Understanding foundational theorems regarding angles subtended by arcs at the circumference.',
                  videoUrl: 'https://www.youtube.com/watch?v=1F5d_0TqP4I',
                  durationMinutes: 40,
                  orderIndex: 0,
                  isFreePreview: false,
                },
              ],
            },
          },
        ],
      },
    },
  });

  const course2 = await prisma.course.upsert({
    where: { slug: 'al-sft-mechanics-and-electronics' },
    update: {
      categoryId: categoryMap['al-sft'],
    },
    create: {
      title: 'A/L Science for Technology (SFT) — Electronics & Mechanics',
      slug: 'al-sft-mechanics-and-electronics',
      shortDescription: 'Master electronics, basic semiconductor physics, logic gates, and mechanics for G.C.E. A/L.',
      description: 'Comprehensive course covering diodes, transistors, digital logic gates, circular motion, Newton laws, and structural mechanics with worked past paper questions.',
      price: 3500.0,
      currency: 'LKR',
      level: CourseLevel.ADVANCED,
      status: CourseStatus.PUBLISHED,
      thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
      categoryId: categoryMap['al-sft'],
      teacherId,
      modules: {
        create: [
          {
            title: 'Unit 1: Semiconductor Diodes & Rectification (ඩයෝඩ සහ ඍජුකාරක)',
            orderIndex: 0,
            lessons: {
              create: [
                {
                  title: '1.1 P-N Junction Physics and Forward/Reverse Bias',
                  content: 'Understanding barrier potential, depletion layer, and diode I-V characteristics.',
                  videoUrl: 'https://www.youtube.com/watch?v=Fwj_d3u_ldo',
                  durationMinutes: 50,
                  orderIndex: 0,
                  isFreePreview: true,
                },
              ],
            },
          },
        ],
      },
    },
  });

  // 7. Enroll Student 1 in Course 1
  await prisma.enrollment.upsert({
    where: {
      studentId_courseId: {
        studentId: studentProfileId,
        courseId: course1.id,
      },
    },
    update: {},
    create: {
      studentId: studentProfileId,
      courseId: course1.id,
      status: EnrollmentStatus.ACTIVE,
    },
  });

  // 8. Class Sessions & Batch Attendance
  const sessionDate = new Date();
  sessionDate.setHours(0, 0, 0, 0);

  let session = await prisma.classSession.findFirst({
    where: {
      gradeId: categoryMap['grade-11-maths'],
      sessionDate,
    },
  });

  if (!session) {
    session = await prisma.classSession.create({
      data: {
        gradeId: categoryMap['grade-11-maths'],
        title: 'Week 3: Quadratic Functions & Past Papers Seminar',
        description: 'Physical class session held in Hall A and streamed live for online students.',
        sessionDate,
        sessionType: SessionType.HYBRID,
      },
    });
  }

  const existingAtt = await prisma.attendance.findFirst({
    where: { studentId: studentProfileId },
  });
  if (!existingAtt) {
    await prisma.attendance.create({
      data: {
        sessionId: session.id,
        studentId: studentProfileId,
        sessionDate,
        status: AttendanceStatus.PRESENT,
        remarks: 'Attended physically and submitted homework booklet.',
      },
    });
  }
  console.log('✔ Class Session and Attendance record created');

  // 9. Monthly Tuition Fee Records
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  await prisma.feeRecord.upsert({
    where: {
      studentId_year_month: {
        studentId: studentProfileId,
        year: currentYear,
        month: currentMonth,
      },
    },
    update: {},
    create: {
      studentId: studentProfileId,
      gradeId: categoryMap['grade-11-maths'],
      year: currentYear,
      month: currentMonth,
      feeAmount: 2500.0,
      paidAmount: 2500.0,
      status: FeePaymentStatus.PAID,
      paymentMethod: PaymentMethod.CASH,
      receiptNumber: `REC-${currentYear}${String(currentMonth).padStart(2, '0')}-1098`,
      paidAt: new Date(),
      note: 'Tuition paid in person at main reception desk.',
    },
  });
  console.log('✔ Tuition Fee Record created with Receipt Number');

  // 10. Sample Certificate for Alex Fernando
  const certCode = 'CERT-MATH-2026-X7K9';
  await prisma.certificate.upsert({
    where: { certificateCode: certCode },
    update: {},
    create: {
      certificateCode: certCode,
      studentId: studentProfileId,
      courseId: course1.id,
      grade: 'DISTINCTION',
    },
  });
  console.log(`✔ Verified Certificate created: Code [${certCode}]`);

  // 11. Welcome Announcement
  await prisma.announcement.create({
    data: {
      title: 'Welcome to the New Academic Session!',
      content: 'We are thrilled to launch the new LMS with monthly fee management, attendance tracking, and verified certificates.',
      targetRole: TargetRole.ALL,
      authorId: admin.id,
    },
  });

  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
