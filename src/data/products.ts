export interface ProductColorVariant {
  color: string;
  value: string;
  images: string[];
}

export interface Product {
  id: string;
  title: string;
  price: number;
  image: string;
  hoverImage?: string;
  collection: string;
  badge?: string;
  description: string;
  details: string[];
  fabric: string;
  packaging: string;
  colors?: string[];
  sizes?: string[];
  variants?: ProductColorVariant[];
}

export const mockProducts: Product[] = [
  {
    id: "1",
    title: "فستان أورا من الحرير بفتحة كتف راقية",
    price: 3400,
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=800&auto=format&fit=crop",
    collection: "مجموعة المساء الكوتور",
    badge: "إصدار محدود",
    description: "صُمم هذا الفستان الأيقوني ليعكس فخامة دار أورا الراقية. قُص الفستان بأسلوب غير متناظر بفتحة كتف ناعمة وتفاصيل درابيه يدوية تنساب بجمال فائق على الجسم، منسوج من الحرير الطبيعي الخالص 100%.",
    details: [
      "حرير طبيعي خام 100%",
      "درابيه ملفوف يدوياً بسلسلة ذهبية رفيعة عند الخصر",
      "سحاب جانبي مخفي للملاءمة التامة",
      "خياطة يدوية دقيقة في أتيلييه الإسكندرية، مصر"
    ],
    fabric: "حرير إيطالي طبيعي خالص 100% تم فحصه وانتقاؤه يدوياً.",
    packaging: "يُسلم بصندوق أورا المخملي الفاخر وحامل الملابس الحريري الخاص. شحن سريع لجميع محافظات مصر.",
    colors: ["أسود", "عاجي", "برونزي"],
    sizes: ["XS", "S", "M", "L", "XL"],
    variants: [
      {
        color: "أسود",
        value: "#111111",
        images: [
          "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop"
        ]
      },
      {
        color: "عاجي",
        value: "#FAF8F5",
        images: [
          "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=800&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop"
        ]
      },
      {
        color: "برونزي",
        value: "#8E6B4B",
        images: [
          "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=800&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=800&auto=format&fit=crop"
        ]
      }
    ]
  },
  {
    id: "2",
    title: "طقم الأناقة من قطعتين كتان فاخر بيج",
    price: 2899,
    image: "https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=800&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop",
    collection: "أطقم قطعتين",
    badge: "صنع بالطلب",
    description: "طقم الأناقة العصري من قطعتين منسوج من خيوط الكتان البلجيكي الطبيعي المعالج بنعومة الكشمير. خطوط هندسية واسعة تمنحكِ هيبة الحضور وراحة التحرك.",
    details: [
      "كتان طبيعي معالج بنعومة الكشمير",
      "قصة بنطلون مستقيمة واسعة بجيوب مخفية",
      "قميص منسدل بتطريز برونزي هادئ عند المعصم",
      "أزرار صدفية طبيعية 100%"
    ],
    fabric: "كتان بلجيكي معالج بنسبة 100% ليوفر الملمس الناعم والهيبة الهيكلية.",
    packaging: "يُسلم بصندوق أورا المخملي المبطن بالقطيفة وحامل الملابس الحريري الفخم.",
    colors: ["بيج", "أسود", "برونزي"],
    sizes: ["XS", "S", "M", "L", "XL"],
    variants: [
      {
        color: "بيج",
        value: "#E1D7C6",
        images: [
          "https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=800&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop"
        ]
      },
      {
        color: "أسود",
        value: "#111111",
        images: [
          "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop"
        ]
      },
      {
        color: "برونزي",
        value: "#8E6B4B",
        images: [
          "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=800&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=800&auto=format&fit=crop"
        ]
      }
    ]
  },
  {
    id: "3",
    title: "بلوزة حريرية مطرزة بياقة كلاسيكية ملوكية",
    price: 1499,
    image: "https://images.unsplash.com/photo-1603252109303-2751441dd157?q=80&w=800&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop",
    collection: "بلوزات",
    badge: "إصدار خاص",
    description: "بلوزة حريرية مترهلة ومطرزة يدوياً بخيوط برونزية ناعمة عند الياقة الملوكية الكلاسيكية. تفاصيل فريدة لعملاء أورا الأكثر تميزاً.",
    details: [
      "حرير طبيعي 100% خفيف الوزن",
      "تطريز يدوي برونزي ناعم",
      "ياقة كلاسيكية ملوكية مرتفعة",
      "أكمام واسعة تنتهي بأساور مطرزة"
    ],
    fabric: "حرير طبيعي 100% خفيف الوزن ذو لمعان مطفأ فاخر.",
    packaging: "يُسلم بصندوق أورا المخملي المبطن بالقطيفة وحامل الملابس الحريري الفخم.",
    colors: ["عاجي", "برونزي"],
    sizes: ["XS", "S", "M", "L", "XL"],
    variants: [
      {
        color: "عاجي",
        value: "#FAF8F5",
        images: [
          "https://images.unsplash.com/photo-1603252109303-2751441dd157?q=80&w=800&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop"
        ]
      },
      {
        color: "برونزي",
        value: "#8E6B4B",
        images: [
          "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=800&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=800&auto=format&fit=crop"
        ]
      }
    ]
  },
  {
    id: "4",
    title: "فستان ميدي كاجوال من خيوط الفيسكوز الإيطالية",
    price: 2299,
    image: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?q=80&w=800&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=800&auto=format&fit=crop",
    collection: "فساتين كاجوال",
    badge: "إصدار مرقم",
    description: "فستان ميدي ناعم وقريب من الجسم من خيوط الفيسكوز والحرير الإيطالي. قصة مضلعة تبرز تفاصيل القوام برقّة وخطوط هندسية عصرية بسيطة.",
    details: [
      "مزيج حرير وفيسكوز 100% مطاطي هادئ",
      "ياقة دائرية ناعمة وفتحة ظهر هندسية",
      "طول ميدي يناسب جميع بوتيكات الصيف",
      "درزة مخفية عند الأطراف"
    ],
    fabric: "فيسكوز وحرير طبيعي إيطالي معالج ومطاطي ناعم.",
    packaging: "يُسلم بصندوق أورا المخملي المبطن بالقطيفة وحامل الملابس الحريري الفخم.",
    colors: ["أسود", "برونزي", "بيج"],
    sizes: ["XS", "S", "M", "L", "XL"],
    variants: [
      {
        color: "أسود",
        value: "#111111",
        images: [
          "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?q=80&w=800&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop"
        ]
      },
      {
        color: "برونزي",
        value: "#8E6B4B",
        images: [
          "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=800&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=800&auto=format&fit=crop"
        ]
      },
      {
        color: "بيج",
        value: "#E1D7C6",
        images: [
          "https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=800&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop"
        ]
      }
    ]
  },
  {
    id: "5",
    title: "قميص أورجانزا راقٍ بنقوش أوراق الذهب البارزة",
    price: 1799,
    image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=800&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=800&auto=format&fit=crop",
    collection: "قمصان",
    badge: "طلب مسبق",
    description: "قميص أورجانزا شفاف من الحرير والأورجانزا الفرنسية، مطرز يدوياً بنقوش بارزة من أوراق البرونز والذهب اللطيفة لتعكس أشعة الشمس بخفة.",
    details: [
      "أورجانزا حريرية فرنسية فاخرة وخفيفة الوزن جداً.",
      "نقوش بارزة برونزية وذهبية مطفأة",
      "قصة واسعة فضفاضة بأكتاف منسدلة",
      "ياقة عريضة كلاسيكية وأزرار مخفية"
    ],
    fabric: "أورجانزا حريرية فرنسية فاخرة وخفيفة الوزن جداً.",
    packaging: "يُسلم بصندوق أورا المخملي المبطن بالقطيفة وحامل الملابس الحريري الفخم.",
    colors: ["ذهبى", "عاجي"],
    sizes: ["XS", "S", "M", "L", "XL"],
    variants: [
      {
        color: "ذهبى",
        value: "#D4AF37",
        images: [
          "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=800&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=800&auto=format&fit=crop"
        ]
      },
      {
        color: "عاجي",
        value: "#FAF8F5",
        images: [
          "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=800&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop"
        ]
      }
    ]
  },
  {
    id: "6",
    title: "بنطلون كريب أسود بقصة مستقيمة ومحيط خصر عريض",
    price: 1299,
    image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=800&auto=format&fit=crop",
    collection: "بنطلونات",
    badge: "مخيط يدوياً",
    description: "بنطلون كريب أسود فاخر ذو وزن مثالي يسقط باستقامة تامة. مصمم بمحيط خصر عريض مشدود يبرز رشاقة ونحافة الخصر وقوة الحضور.",
    details: [
      "كريب إيطالي ثقيل الوزن متماسك",
      "محيط خصر عريض بحياكة مشدودة مبطنة",
      "قصة أرجل مستقيمة مع فتحة أمامية صغيرة مخفية",
      "جيوب جانبية ناعمة متداخلة"
    ],
    fabric: "كريب إيطالي مزدوج الحياكة ذو جودة استثنائية وسقوط مثالي.",
    packaging: "يُسلم بصندوق أورا المخملي المبطن بالقطيفة وحامل الملابس الحريري الفخم.",
    colors: ["أسود", "برونزي"],
    sizes: ["XS", "S", "M", "L", "XL"],
    variants: [
      {
        color: "أسود",
        value: "#111111",
        images: [
          "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop"
        ]
      },
      {
        color: "برونزي",
        value: "#8E6B4B",
        images: [
          "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=800&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=800&auto=format&fit=crop"
        ]
      }
    ]
  },
  {
    id: "7",
    title: "معطف شتوي من الكشمير الفاخر",
    price: 6500,
    image: "https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?q=80&w=800&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=800&auto=format&fit=crop",
    collection: "أزياء الشتاء",
    badge: "جديد",
    description: "معطف شتوي يجمع بين الدفء الاستثنائي والأناقة، مصنوع من الكشمير الخالص المنسوج بحرفية عالية.",
    details: [
      "كشمير طبيعي 100%",
      "بطانة حريرية ناعمة",
      "حزام خصر عريض لضبط المقاس",
      "تصميم طويل يمنحكِ الهيبة والدفء"
    ],
    fabric: "كشمير إيطالي نقي يوفر دفئاً فائقاً بوزن خفيف.",
    packaging: "يُسلم بغلاف مقاوم للعوامل الجوية داخل صندوق أورا المخملي.",
    colors: ["جملي", "أسود", "رمادي"],
    sizes: ["S", "M", "L", "XL"],
    variants: [
      {
        color: "جملي",
        value: "#C19A6B",
        images: ["https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?q=80&w=800&auto=format&fit=crop"]
      }
    ]
  },
  {
    id: "8",
    title: "فستان صيفي خفيف من القطن والكتان",
    price: 2100,
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=800&auto=format&fit=crop",
    collection: "أزياء الصيف",
    badge: "الأكثر مبيعاً",
    description: "فستان صيفي يتميز بنعومة فائقة وتصميم يتيح حرية الحركة وانتعاشاً في أيام الصيف الحارة.",
    details: [
      "مزيج قطن وكتان ناعم ومسامي",
      "تصميم بكسرات انسيابية",
      "ياقة V ناعمة",
      "مثالي لأوقات النهار والمساء"
    ],
    fabric: "قطن مصري ممتاز ممزوج بالكتان لتقليل التجعد.",
    packaging: "يُسلم في حافظة قطنية صديقة للبيئة.",
    colors: ["أبيض", "أزرق فاتح", "وردي"],
    sizes: ["XS", "S", "M", "L", "XL"],
    variants: [
      {
        color: "أبيض",
        value: "#FFFFFF",
        images: ["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop"]
      }
    ]
  },
  {
    id: "9",
    title: "طقم كلاسيكي قطعتين من الحرير والكتان",
    price: 3200,
    image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=800&auto=format&fit=crop",
    collection: "أطقم",
    badge: "مخيط يدوياً",
    description: "طقم الأناقة العصرية يجمع بين بنطلون كلاسيكي وبلوزة متناسقة، يمنحك حضوراً رسمياً بطابع فخم ومريح.",
    details: [
      "مزيج من الكتان والحرير الفاخر",
      "بنطلون بقصة مستقيمة",
      "بلوزة بأزرار مخفية",
      "تصميم هندسي دقيق"
    ],
    fabric: "كتان ممزوج بالحرير للحصول على مظهر انسيابي وثابت.",
    packaging: "يُسلم بصندوق أورا المخملي.",
    colors: ["رمادي داكن", "بيج"],
    sizes: ["XS", "S", "M", "L"],
    variants: [
      {
        color: "رمادي داكن",
        value: "#4B4B4B",
        images: ["https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop"]
      }
    ]
  },
  {
    id: "10",
    title: "حقيبة سهرة كلاسيكية ذهبية",
    price: 4500,
    image: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=800&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1591561954557-26941169b49e?q=80&w=800&auto=format&fit=crop",
    collection: "حقائب",
    badge: "قطعة أساسية",
    description: "حقيبة سهرة صلبة كلاسيكية باللون الذهبي اللامع، مصممة لتكمل إطلالتك بفخامة. تتسع لاحتياجاتك الأساسية مع سلسلة ذهبية رقيقة.",
    details: ["معدن مطلي بماء الذهب المطفأ", "بطانة داخلية من الحرير الأصلي", "قفل هندسي أيقوني"],
    fabric: "معدن فاخر مضاد للخدش",
    packaging: "تُسلم في حقيبة قطنية ناعمة داخل صندوق أورا.",
    colors: ["ذهبي"],
    sizes: ["One Size"]
  },
  {
    id: "11",
    title: "حذاء كعب عالي كلاسيكي أسود",
    price: 3200,
    image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=800&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?q=80&w=800&auto=format&fit=crop",
    collection: "أحذية",
    badge: "حصري",
    description: "حذاء كعب عالي (Stiletto) بجلد طبيعي لامع. قصة مدببة تبرز أنوثة القدمين ومثالي لإطلالات المساء.",
    details: ["جلد عجل طبيعي 100%", "كعب بارتفاع 9 سم", "نعل مريح مبطن"],
    fabric: "جلد طبيعي لامع",
    packaging: "يُسلم في صندوق أحذية أورا الفاخر.",
    colors: ["أسود"],
    sizes: ["37", "38", "39", "40", "41"]
  },
  {
    id: "12",
    title: "قلادة كوتور ذهبية بطبقات متدلية",
    price: 2100,
    image: "https://images.unsplash.com/photo-1599643478524-fb66f7ca065b?q=80&w=800&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=800&auto=format&fit=crop",
    collection: "مجوهرات",
    description: "قلادة رقيقة بطبقات متدلية تبرز جمال منطقة العنق بشكل مثالي مع الفساتين ذات الفتحات الكلاسيكية والياقات المفتوحة.",
    details: ["نحاس مطلي بذهب عيار 18", "تصميم بطبقتين مع تعليقة دائرية هندسية", "خالية من النيكل ومقاومة للتحسس"],
    fabric: "مطلي بالذهب",
    packaging: "تُسلم في علبة مجوهرات أورا الفاخرة.",
    colors: ["ذهبي"],
    sizes: ["One Size"]
  }
];
